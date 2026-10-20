/**
 * Модуль импорта из TBL формата
 * TBL - бинарный формат с XOR шифрованием
 */

import { TBLFile } from '../../lib/tblFile';

/**
 * Импорт данных из TBL файла
 * 
 * @param buffer - ArrayBuffer с содержимым файла
 * @returns Объект с записями, языком и файлом
 */
export function importFromTBL(buffer: ArrayBuffer): { 
  entries: Array<{ id: number; text: string }>; 
  language: string; 
  file: TBLFile 
} {
  const tbl = new TBLFile();
  tbl.load(buffer);
  
  return {
    entries: tbl.entries.map(entry => ({
      id: entry.id,
      text: tbl.getDisplayText(entry)
    })),
    language: tbl.languageText,
    file: tbl
  };
}
