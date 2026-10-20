/**
 * Модуль экспорта данных в различные форматы
 * 
 * Поддерживаемые форматы:
 * - TBL (бинарный формат с XOR шифрованием)
 * - JSON (JavaScript Object Notation)
 * - YAML (YAML Ain't Markup Language)
 * - TOML (Tom's Obvious Minimal Language)
 * - XML (eXtensible Markup Language)
 * - CSV (Comma-Separated Values)
 * - INI (Initialization File)
 */

import { TBLFile, encodeCP1251 } from '../lib/tblFile';

// ============================================
// ТИПЫ
// ============================================

export interface ExportEntry {
  id: number;
  text: string;
}

export type ExportFormat = 'json' | 'yaml' | 'toml' | 'xml' | 'csv' | 'ini';

export interface ExportResult {
  content: string | ArrayBuffer;
  mimeType: string;
  extension: string;
}

// ============================================
// УТИЛИТЫ
// ============================================

/**
 * Экранирование специальных символов для XML
 * 
 * @param text - Текст для экранирования
 * @returns Экранированный текст
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Экранирование текста для CSV
 * 
 * @param text - Текст для экранирования
 * @returns Экранированный текст
 */
function escapeCSV(text: string): string {
  // Если текст содержит запятые, кавычки или переносы строк, оборачиваем в кавычки
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

// ============================================
// ЭКСПОРТ В TBL
// ============================================

/**
 * Экспорт данных в TBL формат
 * 
 * @param entries - Массив записей для экспорта
 * @param language - Язык
 * @param existingFile - Существующий TBL файл (опционально, для сохранения настроек)
 * @returns ArrayBuffer с содержимым TBL файла
 */
export function exportToTBL(
  entries: ExportEntry[],
  language: string,
  existingFile?: TBLFile
): ArrayBuffer {
  // Создаём новый файл или используем существующий
  const tbl = existingFile || createDefaultTBLFile();
  
  // Устанавливаем язык
  tbl.languageText = language;
  
  // Преобразуем записи в формат TBL
  tbl.entries = entries.map(entry => ({
    id: entry.id,
    decrypted: encodeCP1251(entry.text + '\0')
  }));
  
  // Сохраняем в буфер
  return tbl.save();
}

/**
 * Создание TBL файла с настройками по умолчанию
 */
function createDefaultTBLFile(): TBLFile {
  const tbl = new TBLFile();
  tbl.header = {
    CRSH: 0x48535243,
    CRSHSectionSize: 8,
    IDSize: 2,
    LenSize: 1,
    CRSC: 0x43535243,
    CRSCSectionSize: 16,
    StartKEY: 0,
    StepKEY: 1,
    CRSL: 0x4C535243,
    CRSLSectionSize: 16,
    Language: BigInt(0),
    CRSD: 0x44535243,
    CRSDSectionSize: 8,
    SectionCount: 0,
  };
  tbl.entries = [];
  tbl.languageText = '';
  tbl.buildKey();
  return tbl;
}

// ============================================
// ЭКСПОРТ В JSON
// ============================================

/**
 * Экспорт данных в JSON формат
 * 
 * Формат:
 * {
 *   "language": "ru",
 *   "entries": [
 *     { "id": 1, "text": "Привет" },
 *     { "id": 2, "text": "Мир" }
 *   ]
 * }
 * 
 * @param entries - Массив записей для экспорта
 * @param language - Язык
 * @returns JSON строка
 */
export function exportToJSON(entries: ExportEntry[], language: string): string {
  const data = {
    language,
    entries
  };
  
  return JSON.stringify(data, null, 2);
}

// ============================================
// ЭКСПОРТ В YAML
// ============================================

/**
 * Экспорт данных в YAML формат
 * 
 * Формат:
 * language: ru
 * 1: Привет
 * 2: Мир
 * 
 * @param entries - Массив записей для экспорта
 * @param language - Язык
 * @returns YAML строка
 */
export function exportToYAML(entries: ExportEntry[], language: string): string {
  let content = `language: ${language}\n`;
  
  for (const entry of entries) {
    // Если текст содержит переносы строк, используем многострочный формат
    if (entry.text.includes('\n')) {
      content += `${entry.id}: |\n`;
      const lines = entry.text.split('\n');
      for (const line of lines) {
        content += `  ${line}\n`;
      }
    } else {
      content += `${entry.id}: ${entry.text}\n`;
    }
  }
  
  return content;
}

// ============================================
// ЭКСПОРТ В TOML
// ============================================

/**
 * Экспорт данных в TOML формат
 * 
 * Формат:
 * language = "ru"
 * 
 * [1]
 * text = "Привет"
 * 
 * [2]
 * text = "Мир"
 * 
 * @param entries - Массив записей для экспорта
 * @param language - Язык
 * @returns TOML строка
 */
export function exportToTOML(entries: ExportEntry[], language: string): string {
  let content = `language = "${language}"\n\n`;
  
  for (const entry of entries) {
    content += `[${entry.id}]\n`;
    content += `text = "${entry.text}"\n\n`;
  }
  
  return content;
}

// ============================================
// ЭКСПОРТ В XML
// ============================================

/**
 * Экспорт данных в XML формат
 * 
 * Формат:
 * <?xml version="1.0" encoding="UTF-8"?>
 * <entries>
 *   <language>ru</language>
 *   <entry id="1">Привет</entry>
 *   <entry id="2">Мир</entry>
 * </entries>
 * 
 * @param entries - Массив записей для экспорта
 * @param language - Язык
 * @returns XML строка
 */
export function exportToXML(entries: ExportEntry[], language: string): string {
  let content = '<?xml version="1.0" encoding="UTF-8"?>\n';
  content += '<entries>\n';
  content += `  <language>${escapeXml(language)}</language>\n`;
  
  for (const entry of entries) {
    content += `  <entry id="${entry.id}">${escapeXml(entry.text)}</entry>\n`;
  }
  
  content += '</entries>';
  
  return content;
}

// ============================================
// ЭКСПОРТ В CSV
// ============================================

/**
 * Экспорт данных в CSV формат
 * 
 * Формат:
 * language,ru
 * id,text
 * 1,Привет
 * 2,"Мир с запятой"
 * 
 * @param entries - Массив записей для экспорта
 * @param language - Язык
 * @returns CSV строка
 */
export function exportToCSV(entries: ExportEntry[], language: string): string {
  let content = `language,${language}\n`;
  content += `id,text\n`;
  
  for (const entry of entries) {
    content += `${entry.id},${escapeCSV(entry.text)}\n`;
  }
  
  return content;
}

// ============================================
// ЭКСПОРТ В INI
// ============================================

/**
 * Экспорт данных в INI формат
 * 
 * Формат:
 * language=ru
 * 1=Привет
 * 2=Мир
 * 
 * @param entries - Массив записей для экспорта
 * @param language - Язык
 * @returns INI строка
 */
export function exportToINI(entries: ExportEntry[], language: string): string {
  let content = `language=${language}\n`;
  
  for (const entry of entries) {
    content += `${entry.id}=${entry.text}\n`;
  }
  
  return content;
}

// ============================================
// УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ЭКСПОРТА
// ============================================

/**
 * Универсальная функция экспорта в любой поддерживаемый формат
 * 
 * @param format - Формат файла (json, yaml, toml, xml, csv, ini)
 * @param entries - Массив записей для экспорта
 * @param language - Язык
 * @returns Объект с содержимым, MIME типом и расширением
 */
export function exportToFile(
  format: ExportFormat,
  entries: ExportEntry[],
  language: string
): ExportResult {
  let content: string;
  let mimeType: string;
  let extension: string;

  switch (format) {
    case 'json':
      content = exportToJSON(entries, language);
      mimeType = 'application/json';
      extension = 'json';
      break;
    case 'yaml':
      content = exportToYAML(entries, language);
      mimeType = 'text/yaml';
      extension = 'yaml';
      break;
    case 'toml':
      content = exportToTOML(entries, language);
      mimeType = 'application/toml';
      extension = 'toml';
      break;
    case 'xml':
      content = exportToXML(entries, language);
      mimeType = 'application/xml';
      extension = 'xml';
      break;
    case 'csv':
      content = exportToCSV(entries, language);
      mimeType = 'text/csv';
      extension = 'csv';
      break;
    case 'ini':
      content = exportToINI(entries, language);
      mimeType = 'text/plain';
      extension = 'ini';
      break;
    default:
      throw new Error(`Неподдерживаемый формат: ${format}`);
  }

  return { content, mimeType, extension };
}

/**
 * Получение MIME типа для формата
 * 
 * @param format - Формат файла
 * @returns MIME тип
 */
export function getMimeType(format: ExportFormat | 'tbl'): string {
  switch (format) {
    case 'tbl':
      return 'application/octet-stream';
    case 'json':
      return 'application/json';
    case 'yaml':
      return 'text/yaml';
    case 'toml':
      return 'application/toml';
    case 'xml':
      return 'application/xml';
    case 'csv':
      return 'text/csv';
    case 'ini':
      return 'text/plain';
    default:
      return 'text/plain';
  }
}

/**
 * Получение расширения файла для формата
 * 
 * @param format - Формат файла
 * @returns Расширение файла
 */
export function getExtension(format: ExportFormat | 'tbl'): string {
  switch (format) {
    case 'tbl':
      return 'tbl';
    case 'json':
      return 'json';
    case 'yaml':
      return 'yaml';
    case 'toml':
      return 'toml';
    case 'xml':
      return 'xml';
    case 'csv':
      return 'csv';
    case 'ini':
      return 'ini';
    default:
      return 'txt';
  }
}
