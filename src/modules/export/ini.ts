/**
 * Модуль экспорта в INI формат
 * INI - Initialization File
 */

import { ExportEntry } from './types';

/**
 * Экспорт данных в INI формат
 * 
 * Формат:
 * language=ru
 * 1=Привет
 * 2=Мир
 * 
 * @param entries - Массив записей для экспорта
 * @param language - Язык
 * @returns INI строка
 */
export function exportToINI(entries: ExportEntry[], language: string): string {
  let content = `language=${language}\n`;
  
  for (const entry of entries) {
    content += `${entry.id}=${entry.text}\n`;
  }
  
  return content;
}
