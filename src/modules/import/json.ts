/**
 * Модуль импорта из JSON формата
 * JSON - JavaScript Object Notation
 */

import { ImportResult } from './types';

/**
 * Импорт данных из JSON формата
 * 
 * Формат JSON:
 * {
 *   "language": "ru",
 *   "entries": [
 *     { "id": 1, "text": "Привет" },
 *     { "id": 2, "text": "Мир" }
 *   ]
 * }
 * 
 * @param text - Содержимое JSON файла
 * @returns Объект с записями и языком
 */
export function importFromJSON(text: string): ImportResult {
  const json = JSON.parse(text);
  let language = '';
  let entries: Array<{ id: number; text: string }> = [];

  // Извлекаем язык
  if (json.language) {
    language = json.language;
  }

  // Извлекаем записи
  if (json.entries && Array.isArray(json.entries)) {
    entries = json.entries;
  } else if (Array.isArray(json)) {
    entries = json;
  } else {
    // Формат: { "1": "текст", "2": "текст" }
    entries = Object.entries(json)
      .filter(([key]) => key !== 'language')
      .map(([id, text]) => ({ 
        id: parseInt(id), 
        text: text as string 
      }));
  }

  return { entries, language };
}
