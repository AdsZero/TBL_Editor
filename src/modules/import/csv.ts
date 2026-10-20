/**
 * Модуль импорта из CSV формата
 * CSV - Comma-Separated Values
 */

import { ImportResult } from './types';

/**
 * Импорт данных из CSV формата
 * 
 * Формат CSV:
 * language,ru
 * id,text
 * 1,Привет
 * 2,"Мир с запятой"
 * 
 * @param text - Содержимое CSV файла
 * @returns Объект с записями и языком
 */
export function importFromCSV(text: string): ImportResult {
  const lines = text.split('\n')
    .map((l: string) => l.trim())
    .filter((l: string) => l);
  
  const entries: Array<{ id: number; text: string }> = [];
  let language = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Проверяем первую строку на наличие языка
    if (i === 0 && line.toLowerCase().startsWith('language')) {
      const match = line.match(/language[,\s]+(.+)/i);
      if (match) {
        language = match[1];
      }
      continue;
    }

    // Пропускаем заголовок id,text
    if (line.toLowerCase().startsWith('id,text')) {
      continue;
    }

    // Парсим строку с записью
    const match = line.match(/^(\d+),(.*)$/);
    if (match) {
      let text = match[2];
      
      // Удаляем кавычки и экранирование
      if (text.startsWith('"') && text.endsWith('"')) {
        text = text.slice(1, -1).replace(/""/g, '"');
      }
      
      entries.push({ id: parseInt(match[1]), text });
    }
  }

  return { entries, language };
}
