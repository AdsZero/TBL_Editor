/**
 * Модуль импорта из TOML формата
 * TOML - Tom's Obvious Minimal Language
 */

import { ImportResult } from './types';

/**
 * Импорт данных из TOML формата
 * 
 * Формат TOML:
 * language = "ru"
 * 
 * [1]
 * text = "Привет"
 * 
 * [2]
 * text = "Мир"
 * 
 * @param text - Содержимое TOML файла
 * @returns Объект с записями и языком
 */
export function importFromTOML(text: string): ImportResult {
  let currentId: number | null = null;
  let currentText = '';
  const entries: Array<{ id: number; text: string }> = [];
  let language = '';

  const lines = text.split('\n');
  
  for (const line of lines) {
    // Проверяем строку с языком
    const langMatch = line.match(/^language\s*=\s*"(.*)"$/);
    if (langMatch) {
      language = langMatch[1];
      continue;
    }

    // Проверяем заголовок секции [id]
    const match = line.match(/^\[(\d+)\]$/);
    if (match) {
      // Сохраняем предыдущую запись
      if (currentId !== null) {
        entries.push({ id: currentId, text: currentText.trim() });
      }
      currentId = parseInt(match[1]);
      currentText = '';
    } else if (line.startsWith('text = "')) {
      // Извлекаем текст
      currentText = line.slice(7, -1);
    }
  }

  // Сохраняем последнюю запись
  if (currentId !== null) {
    entries.push({ id: currentId, text: currentText.trim() });
  }

  return { entries, language };
}
