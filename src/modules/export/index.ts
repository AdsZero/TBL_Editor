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

// Экспорт типов
export type { ExportEntry, ExportFormat, ExportResult } from './types';

// Экспорт функций экспорта для каждого формата
export { exportToTBL } from './tbl';
export { exportToJSON } from './json';
export { exportToYAML } from './yaml';
export { exportToTOML } from './toml';
export { exportToXML } from './xml';
export { exportToCSV } from './csv';
export { exportToINI } from './ini';

// Импорт функций для универсального экспорта
import { exportToJSON } from './json';
import { exportToYAML } from './yaml';
import { exportToTOML } from './toml';
import { exportToXML } from './xml';
import { exportToCSV } from './csv';
import { exportToINI } from './ini';
import { ExportEntry, ExportFormat, ExportResult } from './types';

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
