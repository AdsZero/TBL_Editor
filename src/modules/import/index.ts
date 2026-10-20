/**
 * Модуль импорта данных из различных форматов
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

// Экспорт типов
export type { ImportResult, ImportFormat } from './types';

// Экспорт функций импорта для каждого формата
export { importFromTBL } from './tbl';
export { importFromJSON } from './json';
export { importFromYAML } from './yaml';
export { importFromTOML } from './toml';
export { importFromXML } from './xml';
export { importFromCSV } from './csv';
export { importFromINI } from './ini';

// Импорт функций для универсального экспорта
import { importFromJSON } from './json';
import { importFromYAML } from './yaml';
import { importFromTOML } from './toml';
import { importFromXML } from './xml';
import { importFromCSV } from './csv';
import { importFromINI } from './ini';
import { ImportResult, ImportFormat } from './types';

/**
 * Универсальная функция импорта из любого поддерживаемого формата
 * 
 * @param format - Формат файла (json, yaml, toml, xml, csv, ini)
 * @param text - Содержимое файла
 * @returns Объект с записями и языком
 */
export function importFromFile(format: ImportFormat, text: string): ImportResult {
  switch (format) {
    case 'json':
      return importFromJSON(text);
    case 'yaml':
      return importFromYAML(text);
    case 'toml':
      return importFromTOML(text);
    case 'xml':
      return importFromXML(text);
    case 'csv':
      return importFromCSV(text);
    case 'ini':
      return importFromINI(text);
    default:
      throw new Error(`Неподдерживаемый формат: ${format}`);
  }
}
