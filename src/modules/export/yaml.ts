/**
 * Модуль экспорта в YAML формат
 * YAML - YAML Ain't Markup Language
 */

import { ExportEntry } from './types';

/**
 * Экспорт данных в YAML формат
 * 
 * Формат:
 * language: ru
 * 1: Привет
 * 2: Мир
 * 
 * @param entries - Массив записей для экспорта
 * @param language - Язык
 * @returns YAML строка
 */
export function exportToYAML(entries: ExportEntry[], language: string): string {
  let content = `language: ${language}\n`;
  
  for (const entry of entries) {
    // Если текст содержит переносы строк, используем многострочный формат
    if (entry.text.includes('\n')) {
      content += `${entry.id}: |\n`;
      const lines = entry.text.split('\n');
      for (const line of lines) {
        content += `  ${line}\n`;
      }
    } else {
      content += `${entry.id}: ${entry.text}\n`;
    }
  }
  
  return content;
}
