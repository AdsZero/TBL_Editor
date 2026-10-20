/**
 * Модуль экспорта в JSON формат
 * JSON - JavaScript Object Notation
 */

import { ExportEntry } from './types';

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
