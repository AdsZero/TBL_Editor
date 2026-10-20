/**
 * Модуль импорта данных из различных форматов
 * 
 * Поддерживаемые форматы:
 * - TBL (бинарный формат с XOR шифрованием)
 * - JSON (JavaScript Object Notation)
 * - YAML (YAML Ain't Markup Language)
 * - TOML (Tom's Obvious Minimal Language)
 * - XML (eXtensible Markup Language)
 * - CSV (Comma-Separated Values)
 * - INI (Initialization File)
 */

import { TBLFile, encodeCP1251 } from '../lib/tblFile';

// ============================================
// ТИПЫ
// ============================================

export interface ImportResult {
  entries: Array<{ id: number; text: string }>;
  language: string;
}

export type ImportFormat = 'json' | 'yaml' | 'toml' | 'xml' | 'csv' | 'ini';

// ============================================
// ИМПОРТ ИЗ TBL
// ============================================

/**
 * Импорт данных из TBL файла
 * 
 * @param buffer - ArrayBuffer с содержимым файла
 * @returns Объект с записями и языком
 */
export function importFromTBL(buffer: ArrayBuffer): { entries: Array<{ id: number; text: string }>; language: string; file: TBLFile } {
  const tbl = new TBLFile();
  tbl.load(buffer);
  
  return {
    entries: tbl.entries.map(entry => ({
      id: entry.id,
      text: tbl.getDisplayText(entry)
    })),
    language: tbl.languageText,
    file: tbl
  };
}

// ============================================
// ИМПОРТ ИЗ JSON
// ============================================

/**
 * Импорт данных из JSON формата
 * 
 * Формат JSON:
 * {
 *   "language": "ru",
 *   "entries": [
 *     { "id": 1, "text": "Привет" },
 *     { "id": 2, "text": "Мир" }
 *   ]
 * }
 * 
 * @param text - Содержимое JSON файла
 * @returns Объект с записями и языком
 */
export function importFromJSON(text: string): ImportResult {
  const json = JSON.parse(text);
  let language = '';
  let entries: Array<{ id: number; text: string }> = [];

  // Извлекаем язык
  if (json.language) {
    language = json.language;
  }

  // Извлекаем записи
  if (json.entries && Array.isArray(json.entries)) {
    entries = json.entries;
  } else if (Array.isArray(json)) {
    entries = json;
  } else {
    // Формат: { "1": "текст", "2": "текст" }
    entries = Object.entries(json)
      .filter(([key]) => key !== 'language')
      .map(([id, text]) => ({ 
        id: parseInt(id), 
        text: text as string 
      }));
  }

  return { entries, language };
}

// ============================================
// ИМПОРТ ИЗ YAML
// ============================================

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

// ============================================
// ИМПОРТ ИЗ TOML
// ============================================

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

// ============================================
// ИМПОРТ ИЗ XML
// ============================================

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

// ============================================
// ИМПОРТ ИЗ CSV
// ============================================

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

// ============================================
// ИМПОРТ ИЗ INI
// ============================================

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

// ============================================
// УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ИМПОРТА
// ============================================

/**
 * Универсальная функция импорта из любого поддерживаемого формата
 * 
 * @param format - Формат файла (json, yaml, toml, xml, csv, ini)
 * @param text - Содержимое файла
 * @returns Объект с записями и языком
 */
export function importFromFile(format: ImportFormat, text: string): ImportResult {
  switch (format) {
    case 'json':
      return importFromJSON(text);
    case 'yaml':
      return importFromYAML(text);
    case 'toml':
      return importFromTOML(text);
    case 'xml':
      return importFromXML(text);
    case 'csv':
      return importFromCSV(text);
    case 'ini':
      return importFromINI(text);
    default:
      throw new Error(`Неподдерживаемый формат: ${format}`);
  }
}
