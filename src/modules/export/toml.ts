/**
 * Модуль экспорта в TOML формат
 * TOML - Tom's Obvious Minimal Language
 */

import { ExportEntry } from './types';

/**
 * Экспорт данных в TOML формат
 * 
 * Формат:
 * language = "ru"
 * 
 * [1]
 * text = "Привет"
 * 
 * [2]
 * text = "Мир"
 * 
 * @param entries - Массив записей для экспорта
 * @param language - Язык
 * @returns TOML строка
 */
export function exportToTOML(entries: ExportEntry[], language: string): string {
  let content = `language = "${language}"\n\n`;
  
  for (const entry of entries) {
    content += `[${entry.id}]\n`;
    content += `text = "${entry.text}"\n\n`;
  }
  
  return content;
}
