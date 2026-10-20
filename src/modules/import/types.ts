/**
 * Общие типы для модулей импорта
 */

export interface ImportResult {
  entries: Array<{ id: number; text: string }>;
  language: string;
}

export type ImportFormat = 'json' | 'yaml' | 'toml' | 'xml' | 'csv' | 'ini';
