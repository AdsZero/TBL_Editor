/**
 * Модуль экспорта в CSV формат
 * CSV - Comma-Separated Values
 */

import { ExportEntry } from './types';

/**
 * Экранирование текста для CSV
 * 
 * @param text - Текст для экранирования
 * @returns Экранированный текст
 */
function escapeCSV(text: string): string {
  // Если текст содержит запятые, кавычки или переносы строк, оборачиваем в кавычки
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Экспорт данных в CSV формат
 * 
 * Формат:
 * language,ru
 * id,text
 * 1,Привет
 * 2,"Мир с запятой"
 * 
 * @param entries - Массив записей для экспорта
 * @param language - Язык
 * @returns CSV строка
 */
export function exportToCSV(entries: ExportEntry[], language: string): string {
  let content = `language,${language}\n`;
  content += `id,text\n`;
  
  for (const entry of entries) {
    content += `${entry.id},${escapeCSV(entry.text)}\n`;
  }
  
  return content;
}
