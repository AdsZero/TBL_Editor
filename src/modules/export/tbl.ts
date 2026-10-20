/**
 * Модуль экспорта в TBL формат
 * TBL - бинарный формат с XOR шифрованием
 */

import { TBLFile, encodeCP1251 } from '../../lib/tblFile';
import { ExportEntry } from './types';

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
