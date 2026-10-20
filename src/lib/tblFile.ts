// TBL File Parser/Writer - Binary format with XOR encryption

export interface TBLHeader {
  CRSH: number;
  CRSHSectionSize: number;
  IDSize: number;
  LenSize: number;
  CRSC: number;
  CRSCSectionSize: number;
  StartKEY: number;
  StepKEY: number;
  CRSL: number;
  CRSLSectionSize: number;
  Language: bigint;
  CRSD: number;
  CRSDSectionSize: number;
  SectionCount: number;
}

export interface TBLEntry {
  id: number;
  decrypted: Uint8Array;
}

export class TBLFile {
  header: TBLHeader = {} as TBLHeader;
  entries: TBLEntry[] = [];
  key: Uint8Array = new Uint8Array(16);
  languageText: string = '';
  path: string = '';
  encoding: string = 'windows-1251';

  private headerFields: [string, string, number][] = [
    ['CRSH', 'I', 4],
    ['CRSHSectionSize', 'I', 4],
    ['IDSize', 'H', 2],
    ['LenSize', 'H', 2],
    ['CRSC', 'I', 4],
    ['CRSCSectionSize', 'I', 4],
    ['StartKEY', 'I', 4],
    ['StepKEY', 'I', 4],
    ['CRSL', 'I', 4],
    ['CRSLSectionSize', 'I', 4],
    ['Language', 'Q', 8],
    ['CRSD', 'I', 4],
    ['CRSDSectionSize', 'I', 4],
    ['SectionCount', 'I', 4],
  ];

  buildKey(): void {
    const start = this.header.StartKEY;
    const step = this.header.StepKEY;
    this.key = new Uint8Array(16);
    for (let i = 0; i < 16; i++) {
      this.key[i] = (start + i * step) & 0xFF;
    }
  }

  private decrypt(data: Uint8Array, startPos: number): Uint8Array {
    const result = new Uint8Array(data.length);
    for (let j = 0; j < data.length; j++) {
      result[j] = data[j] ^ this.key[(startPos + j) % 16];
    }
    return result;
  }

  private encrypt(data: Uint8Array, startPos: number): Uint8Array {
    return this.decrypt(data, startPos);
  }

  load(buffer: ArrayBuffer): void {
    const data = new Uint8Array(buffer);
    const view = new DataView(buffer);
    let offset = 0;

    this.header.CRSH = view.getUint32(offset, true); offset += 4;
    this.header.CRSHSectionSize = view.getUint32(offset, true); offset += 4;
    this.header.IDSize = view.getUint16(offset, true); offset += 2;
    this.header.LenSize = view.getUint16(offset, true); offset += 2;
    this.header.CRSC = view.getUint32(offset, true); offset += 4;
    this.header.CRSCSectionSize = view.getUint32(offset, true); offset += 4;
    this.header.StartKEY = view.getUint32(offset, true); offset += 4;
    this.header.StepKEY = view.getUint32(offset, true); offset += 4;
    this.header.CRSL = view.getUint32(offset, true); offset += 4;
    this.header.CRSLSectionSize = view.getUint32(offset, true); offset += 4;

    this.buildKey();

    const langSize = this.header.CRSLSectionSize - 8;
    const langBytes = new Uint8Array(buffer, offset, langSize);
    const langDec = this.decrypt(langBytes, 0);
    this.languageText = this.decodeText(langDec).replace(/\0+$/, '');
    this.header.Language = BigInt(0);
    offset += langSize;

    this.header.CRSD = view.getUint32(offset, true); offset += 4;
    this.header.CRSDSectionSize = view.getUint32(offset, true); offset += 4;
    this.header.SectionCount = view.getUint32(offset, true); offset += 4;

    const idBytes = this.header.IDSize * 2;
    const lenBytes = this.header.LenSize * 2;
    const count = this.header.SectionCount;

    let keyPos = langSize;
    this.entries = [];

    for (let i = 0; i < count; i++) {
      if (offset + idBytes + lenBytes > buffer.byteLength) break;

      let entryId: number;
      if (idBytes === 2) {
        entryId = view.getUint16(offset, true);
      } else if (idBytes === 4) {
        entryId = view.getUint32(offset, true);
      } else {
        entryId = 0;
        for (let b = 0; b < idBytes; b++) {
          entryId |= (data[offset + b]) << (b * 8);
        }
      }
      offset += idBytes;

      let length: number;
      if (lenBytes === 2) {
        length = view.getUint16(offset, true);
      } else if (lenBytes === 4) {
        length = view.getUint32(offset, true);
      } else {
        length = 0;
        for (let b = 0; b < lenBytes; b++) {
          length |= (data[offset + b]) << (b * 8);
        }
      }
      offset += lenBytes;

      if (offset + length > buffer.byteLength) break;
      const encrypted = new Uint8Array(buffer, offset, length);
      offset += length;

      const decrypted = this.encrypt(encrypted, keyPos);
      keyPos += length;

      this.entries.push({ id: entryId, decrypted: decrypted });
    }
  }

  getDisplayText(entry: TBLEntry): string {
    return this.decodeText(entry.decrypted).replace(/\0+$/, '');
  }

  setText(entry: TBLEntry, newText: string): void {
    const wasNullTerminated = entry.decrypted[entry.decrypted.length - 1] === 0;
    let newBytes = this.encodeText(newText);
    if (wasNullTerminated) {
      const withNull = new Uint8Array(newBytes.length + 1);
      withNull.set(newBytes);
      withNull[newBytes.length] = 0;
      newBytes = withNull;
    }
    entry.decrypted = newBytes;
  }

  setLanguage(newText: string): void {
    this.languageText = newText;
  }

  save(): ArrayBuffer {
    let langBytes = this.encodeText(this.languageText);
    if (langBytes.length === 0 || langBytes[langBytes.length - 1] !== 0) {
      const withNull = new Uint8Array(langBytes.length + 1);
      withNull.set(langBytes);
      withNull[langBytes.length] = 0;
      langBytes = withNull;
    }
    
    const crslSectionSize = 8 + langBytes.length;
    const langEncrypted = this.encrypt(langBytes, 0);

    const idBytes = this.header.IDSize * 2;
    const lenBytes = this.header.LenSize * 2;

    const fixedHeaderSize = 4 + 4 + 2 + 2 + 4 + 4 + 4 + 4 + 4 + 4 + 4 + 4 + 4;
    const headerSize = fixedHeaderSize + langBytes.length;
    
    let totalSize = headerSize;
    for (const entry of this.entries) {
      totalSize += idBytes + lenBytes + entry.decrypted.length;
    }

    const buffer = new ArrayBuffer(totalSize);
    const view = new DataView(buffer);
    let offset = 0;

    view.setUint32(offset, this.header.CRSH, true); offset += 4;
    view.setUint32(offset, this.header.CRSHSectionSize, true); offset += 4;
    view.setUint16(offset, this.header.IDSize, true); offset += 2;
    view.setUint16(offset, this.header.LenSize, true); offset += 2;
    view.setUint32(offset, this.header.CRSC, true); offset += 4;
    view.setUint32(offset, this.header.CRSCSectionSize, true); offset += 4;
    view.setUint32(offset, this.header.StartKEY, true); offset += 4;
    view.setUint32(offset, this.header.StepKEY, true); offset += 4;
    view.setUint32(offset, this.header.CRSL, true); offset += 4;
    view.setUint32(offset, crslSectionSize, true); offset += 4;

    const langSection = new Uint8Array(buffer, offset, langBytes.length);
    langSection.set(langEncrypted);
    offset += langBytes.length;

    view.setUint32(offset, this.header.CRSD, true); offset += 4;
    view.setUint32(offset, this.header.CRSDSectionSize, true); offset += 4;
    view.setUint32(offset, this.entries.length, true); offset += 4;

    let keyPos = langBytes.length;
    for (const entry of this.entries) {
      const textBytes = entry.decrypted;
      const length = textBytes.length;

      if (idBytes === 2) {
        view.setUint16(offset, entry.id, true);
      } else if (idBytes === 4) {
        view.setUint32(offset, entry.id, true);
      } else {
        const idArr = new Uint8Array(buffer, offset, idBytes);
        for (let b = 0; b < idBytes; b++) {
          idArr[b] = (entry.id >> (b * 8)) & 0xFF;
        }
      }
      offset += idBytes;

      if (lenBytes === 2) {
        view.setUint16(offset, length, true);
      } else if (lenBytes === 4) {
        view.setUint32(offset, length, true);
      } else {
        const lenArr = new Uint8Array(buffer, offset, lenBytes);
        for (let b = 0; b < lenBytes; b++) {
          lenArr[b] = (length >> (b * 8)) & 0xFF;
        }
      }
      offset += lenBytes;

      const encrypted = this.encrypt(textBytes, keyPos);
      const outArr = new Uint8Array(buffer, offset, length);
      outArr.set(encrypted);
      offset += length;

      keyPos += length;
    }

    return buffer;
  }

  private decodeText(data: Uint8Array): string {
    try {
      const decoder = new TextDecoder(this.encoding);
      return decoder.decode(data);
    } catch {
      return this.decodeCP1251(data);
    }
  }

  private decodeCP1251(data: Uint8Array): string {
    let result = '';
    for (let i = 0; i < data.length; i++) {
      const byte = data[i];
      if (byte < 128) {
        result += String.fromCharCode(byte);
      } else {
        const unicode = CP1251_DECODE[byte];
        if (unicode && unicode !== 0xFFFD) {
          result += String.fromCharCode(unicode);
        } else {
          result += '?';
        }
      }
    }
    return result;
  }

  private encodeText(text: string): Uint8Array {
    return this.encodeCP1251(text);
  }

  private encodeCP1251(text: string): Uint8Array {
    const result: number[] = [];
    for (let i = 0; i < text.length; i++) {
      const code = text.charCodeAt(i);
      if (code <= 127) {
        result.push(code);
      } else {
        const mapped = CP1251_MAP.get(code);
        if (mapped !== undefined) {
          result.push(mapped);
        } else {
          result.push(0x3F);
        }
      }
    }
    return new Uint8Array(result);
  }
}

const CP1251_MAP = new Map<number, number>();

const CP1251_DECODE: readonly number[] = [
  ...Array.from({ length: 128 }, (_, i) => i),
  0x0402, 0x0403, 0x201A, 0x0453, 0x201E, 0x2026, 0x2020, 0x2021,
  0x20AC, 0x2030, 0x0409, 0x2039, 0x040A, 0x040C, 0x040B, 0x040F,
  0x0452, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014,
  0xFFFD, 0x2122, 0x0459, 0x203A, 0x045A, 0x045C, 0x045B, 0x045F,
  0x00A0, 0x040E, 0x045E, 0x0408, 0x00A4, 0x0490, 0x00A6, 0x00A7,
  0x0401, 0x00A9, 0x0404, 0x00AB, 0x00AC, 0x00AD, 0x00AE, 0x0407,
  0x00B0, 0x00B1, 0x0406, 0x0456, 0x0491, 0x00B5, 0x00B6, 0x00B7,
  0x0451, 0x2116, 0x0454, 0x00BB, 0x0458, 0x0405, 0x0455, 0x0457,
];

for (let i = 0; i < 128; i++) {
  CP1251_MAP.set(i, i);
}
for (let i = 0; i < CP1251_DECODE.length - 128; i++) {
  const unicode = CP1251_DECODE[i + 128];
  if (unicode !== 0xFFFD) {
    CP1251_MAP.set(unicode, i + 128);
  }
}

for (let i = 0; i < 16; i++) {
  CP1251_MAP.set(0x0410 + i, 0xC0 + i);
  CP1251_MAP.set(0x0430 + i, 0xE0 + i);
  CP1251_MAP.set(0x0440 + i, 0xF0 + i);
  CP1251_MAP.set(0x0420 + i, 0xD0 + i);
}

export function encodeCP1251(text: string): Uint8Array {
  const result: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code <= 127) {
      result.push(code);
    } else {
      const mapped = CP1251_MAP.get(code);
      if (mapped !== undefined) {
        result.push(mapped);
      } else {
        result.push(0x3F);
      }
    }
  }
  return new Uint8Array(result);
}
