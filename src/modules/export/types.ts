/**
 * Общие типы для модулей экспорта
 */

export interface ExportEntry {
  id: number;
  text: string;
}

export type ExportFormat = 'json' | 'yaml' | 'toml' | 'xml' | 'csv' | 'ini';

export interface ExportResult {
  content: string | ArrayBuffer;
  mimeType: string;
  extension: string;
}
