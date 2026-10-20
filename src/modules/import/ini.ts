/**
 * Модуль импорта из INI формата
 * INI - Initialization File
 */

import { ImportResult } from './types';

/**
 * Импорт данных из INI формата
 * 
 * Формат INI:
 * language=ru
 * 1=Привет
 * 2=Мир
 * 
 * @param text - Содержимое INI файла
 * @returns Объект с записями и языком
 */
export function importFromINI(text: string): ImportResult {
  const entries: Array<{ id: number; text: string }> = [];
  let language = '';

  const lines = text.split('\n');
  
  for (const line of lines) {
    // Проверяем строку с языком
    const langMatch = line.match(/^language\s*=\s*(.*)$/i);
    if (langMatch) {
      language = langMatch[1];
      continue;
    }

    // Парсим строку с записью
    const match = line.match(/^(\d+)\s*=\s*(.*)$/);
    if (match) {
      entries.push({ id: parseInt(match[1]), text: match[2] });
    }
  }

  return { entries, language };
}
