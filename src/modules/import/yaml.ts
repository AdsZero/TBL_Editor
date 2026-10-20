/**
 * Модуль импорта из YAML формата
 * YAML - YAML Ain't Markup Language
 */

import { ImportResult } from './types';

/**
 * Импорт данных из YAML формата
 * 
 * Формат YAML:
 * language: ru
 * 1: Привет
 * 2: Мир
 * 
 * @param text - Содержимое YAML файла
 * @returns Объект с записями и языком
 */
export function importFromYAML(text: string): ImportResult {
  let currentId: number | null = null;
  let currentText = '';
  const entries: Array<{ id: number; text: string }> = [];
  let language = '';

  const lines = text.split('\n');
  
  for (const line of lines) {
    // Проверяем строку с языком
    const langMatch = line.match(/^language:\s*(.*)$/);
    if (langMatch) {
      language = langMatch[1];
      continue;
    }

    // Проверяем строку с записью
    const match = line.match(/^(\d+):\s*(.*)$/);
    if (match) {
      // Сохраняем предыдущую запись
      if (currentId !== null) {
        entries.push({ id: currentId, text: currentText.trim() });
      }
      currentId = parseInt(match[1]);
      currentText = match[2];
    } else if (currentId !== null && line.startsWith('  ')) {
      // Продолжение многострочного текста
      currentText += '\n' + line.trim();
    }
  }

  // Сохраняем последнюю запись
  if (currentId !== null) {
    entries.push({ id: currentId, text: currentText.trim() });
  }

  return { entries, language };
}
