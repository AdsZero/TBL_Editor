/**
 * Модуль экспорта в XML формат
 * XML - eXtensible Markup Language
 */

import { ExportEntry } from './types';

/**
 * Экранирование специальных символов для XML
 * 
 * @param text - Текст для экранирования
 * @returns Экранированный текст
 */
function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Экспорт данных в XML формат
 * 
 * Формат:
 * <?xml version="1.0" encoding="UTF-8"?>
 * <entries>
 *   <language>ru</language>
 *   <entry id="1">Привет</entry>
 *   <entry id="2">Мир</entry>
 * </entries>
 * 
 * @param entries - Массив записей для экспорта
 * @param language - Язык
 * @returns XML строка
 */
export function exportToXML(entries: ExportEntry[], language: string): string {
  let content = '<?xml version="1.0" encoding="UTF-8"?>\n';
  content += '<entries>\n';
  content += `  <language>${escapeXml(language)}</language>\n`;
  
  for (const entry of entries) {
    content += `  <entry id="${entry.id}">${escapeXml(entry.text)}</entry>\n`;
  }
  
  content += '</entries>';
  
  return content;
}
