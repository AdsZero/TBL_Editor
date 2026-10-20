/**
 * Модуль импорта из XML формата
 * XML - eXtensible Markup Language
 */

import { ImportResult } from './types';

/**
 * Импорт данных из XML формата
 * 
 * Формат XML:
 * <?xml version="1.0" encoding="UTF-8"?>
 * <entries>
 *   <language>ru</language>
 *   <entry id="1">Привет</entry>
 *   <entry id="2">Мир</entry>
 * </entries>
 * 
 * @param text - Содержимое XML файла
 * @returns Объект с записями и языком
 */
export function importFromXML(text: string): ImportResult {
  const doc = new DOMParser().parseFromString(text, 'text/xml');
  
  // Извлекаем язык
  const langNode = doc.querySelector('language');
  const language = langNode?.textContent || '';
  
  // Извлекаем записи
  const entries: Array<{ id: number; text: string }> = [];
  doc.querySelectorAll('entry').forEach(item => {
    const id = parseInt(item.getAttribute('id') || '0');
    const text = item.textContent || '';
    entries.push({ id, text });
  });

  return { entries, language };
}
