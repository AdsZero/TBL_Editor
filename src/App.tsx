/**
 * TBL Editor - Главный компонент приложения
 * 
 * Приложение для работы с TBL файлами (бинарный формат с XOR шифрованием)
 * Поддерживает: создание, открытие, редактирование, сохранение, импорт/экспорт
 */

import { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { TBLFile, TBLEntry, encodeCP1251 } from './lib/tblFile';
import ThemeToggle from './components/ThemeToggle';
import LanguageSelector from './components/LanguageSelector';
import { useLocalization } from './hooks/useLocalization';

// ============================================
// ТИПЫ И ИНТЕРФЕЙСЫ
// ============================================

type SortField = 'id' | 'name';
type SortDirection = 'asc' | 'desc';

interface DisplayEntry {
  index: number;
  id: number;
  text: string;
}

// ============================================
// ГЛАВНЫЙ КОМПОНЕНТ
// ============================================

function App() {
  // Локализация
  const { t, currentLang, setCurrentLang, availableLangs } = useLocalization();
  
  // Состояние файла
  const [tblFile, setTblFile] = useState<TBLFile | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [entries, setEntries] = useState<DisplayEntry[]>([]);
  const [language, setLanguage] = useState<string>('');
  const [isModified, setIsModified] = useState(false);
  
  // Состояние избранного
  const [favorites, setFavorites] = useState<Set<number>>(new Set());
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  
  // Состояние сортировки
  const [sortField, setSortField] = useState<SortField>('id');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  
  // Состояние поиска
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Состояние уведомлений
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  // Состояние модального окна
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [modalEntryId, setModalEntryId] = useState<string>('');
  const [modalEntryText, setModalEntryText] = useState<string>('');
  const [modalEditIndex, setModalEditIndex] = useState<number | null>(null);
  
  // Состояние выбора строк
  const [selectedRows, setSelectedRows] = useState<Set<number>>(new Set());
  
  // Состояние меню файлов
  const [showFileMenu, setShowFileMenu] = useState(false);
  const [showImportSubmenu, setShowImportSubmenu] = useState(false);
  const [showExportSubmenu, setShowExportSubmenu] = useState(false);
  const [importSubmenuPos, setImportSubmenuPos] = useState({ top: 0, left: 0 });
  const [exportSubmenuPos, setExportSubmenuPos] = useState({ top: 0, left: 0 });

  // Refs для DOM элементов
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importBtnRef = useRef<HTMLButtonElement>(null);
  const exportBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // ============================================
  // УВЕДОМЛЕНИЯ
  // ============================================

  /**
   * Показать уведомление
   */
  const showNotification = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 2500);
  }, []);

  // ============================================
  // РАБОТА С ФАЙЛАМИ
  // ============================================

  /**
   * Обновить список записей из файла
   */
  const refreshEntries = useCallback((file: TBLFile) => {
    const displayEntries: DisplayEntry[] = file.entries.map((entry, index) => ({
      index,
      id: entry.id,
      text: file.getDisplayText(entry),
    }));
    setEntries(displayEntries);
    setLanguage(file.languageText);
  }, []);

  /**
   * Создать пустой TBL файл
   */
  const createEmptyTBLFile = useCallback(() => {
    const tbl = new TBLFile();
    tbl.header = {
      CRSH: 0x48535243,
      CRSHSectionSize: 8,
      IDSize: 2,
      LenSize: 1,
      CRSC: 0x43535243,
      CRSCSectionSize: 16,
      StartKEY: 0,
      StepKEY: 1,
      CRSL: 0x4C535243,
      CRSLSectionSize: 16,
      Language: BigInt(0),
      CRSD: 0x44535243,
      CRSDSectionSize: 8,
      SectionCount: 0,
    };
    tbl.entries = [];
    tbl.languageText = '';
    tbl.buildKey();
    return tbl;
  }, []);

  /**
   * Создать новый файл
   */
  const handleCreateNew = useCallback(() => {
    const tbl = createEmptyTBLFile();
    tbl.path = 'new.tbl';
    setTblFile(tbl);
    setFileName('new.tbl');
    refreshEntries(tbl);
    setIsModified(false);
    setSelectedRows(new Set());
    setFavorites(new Set());
    setShowFavoritesOnly(false);
    showNotification('success', t('file_created'));
    setShowFileMenu(false);
  }, [createEmptyTBLFile, refreshEntries, showNotification, t]);

  /**
   * Открыть файл
   */
  const handleFileOpen = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const buffer = await file.arrayBuffer();
      const tbl = new TBLFile();
      tbl.load(buffer);
      tbl.path = file.name;
      setTblFile(tbl);
      setFileName(file.name);
      refreshEntries(tbl);
      setIsModified(false);
      setSelectedRows(new Set());
      setFavorites(new Set());
      setShowFavoritesOnly(false);
      showNotification('success', `${t('file_opened')}: ${file.name}`);
    } catch (err: any) {
      showNotification('error', `${t('error')}: ${err.message}`);
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
    setShowFileMenu(false);
  }, [refreshEntries, showNotification, t]);

  /**
   * Сохранить файл
   */
  const handleSave = useCallback(() => {
    if (!tblFile) {
      showNotification('error', t('no_file_error'));
      return;
    }

    try {
      const buffer = tblFile.save();
      const blob = new Blob([buffer], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const baseName = fileName.replace(/\.[^/.]+$/, '') || 'output';
      a.download = `${baseName}.tbl`;
      a.click();
      URL.revokeObjectURL(url);
      setIsModified(false);
      showNotification('success', t('file_saved'));
    } catch (err: any) {
      showNotification('error', `${t('error')}: ${err.message}`);
    }
    setShowFileMenu(false);
  }, [tblFile, fileName, showNotification, t]);

  // ============================================
  // ИМПОРТ/ЭКСПОРТ
  // ============================================

  /**
   * Импортировать файл
   */
  const handleImport = useCallback(async (format: string) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = `.${format},.${format === 'yaml' ? 'yml' : format}`;

    input.onchange = async (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const text = await file.text();
        let importedData: { id: number; text: string }[] = [];
        let importedLanguage = '';

        // Парсинг в зависимости от формата
        if (format === 'json') {
          const json = JSON.parse(text);
          if (json.language) importedLanguage = json.language;
          if (json.entries && Array.isArray(json.entries)) importedData = json.entries;
          else if (Array.isArray(json)) importedData = json;
          else importedData = Object.entries(json).filter(([key]) => key !== 'language').map(([id, text]) => ({ id: parseInt(id), text: text as string }));
        } else if (format === 'ini') {
          for (const line of text.split('\n')) {
            const langMatch = line.match(/^language\s*=\s*(.*)$/i);
            if (langMatch) { importedLanguage = langMatch[1]; continue; }
            const match = line.match(/^(\d+)\s*=\s*(.*)$/);
            if (match) importedData.push({ id: parseInt(match[1]), text: match[2] });
          }
        } else if (format === 'yaml') {
          let currentId: number | null = null;
          let currentText = '';
          for (const line of text.split('\n')) {
            const langMatch = line.match(/^language:\s*(.*)$/);
            if (langMatch) { importedLanguage = langMatch[1]; continue; }
            const match = line.match(/^(\d+):\s*(.*)$/);
            if (match) {
              if (currentId !== null) importedData.push({ id: currentId, text: currentText.trim() });
              currentId = parseInt(match[1]);
              currentText = match[2];
            } else if (currentId !== null && line.startsWith('  ')) {
              currentText += '\n' + line.trim();
            }
          }
          if (currentId !== null) importedData.push({ id: currentId, text: currentText.trim() });
        } else if (format === 'toml') {
          let currentId: number | null = null;
          let currentText = '';
          for (const line of text.split('\n')) {
            const langMatch = line.match(/^language\s*=\s*"(.*)"$/);
            if (langMatch) { importedLanguage = langMatch[1]; continue; }
            const match = line.match(/^\[(\d+)\]$/);
            if (match) {
              if (currentId !== null) importedData.push({ id: currentId, text: currentText.trim() });
              currentId = parseInt(match[1]);
              currentText = '';
            } else if (line.startsWith('text = "')) {
              currentText = line.slice(7, -1);
            }
          }
          if (currentId !== null) importedData.push({ id: currentId, text: currentText.trim() });
        } else if (format === 'xml') {
          const doc = new DOMParser().parseFromString(text, 'text/xml');
          const langNode = doc.querySelector('language');
          if (langNode) importedLanguage = langNode.textContent || '';
          doc.querySelectorAll('entry').forEach(item => {
            importedData.push({ id: parseInt(item.getAttribute('id') || '0'), text: item.textContent || '' });
          });
        } else if (format === 'csv') {
          const lines = text.split('\n').map((l: string) => l.trim()).filter((l: string) => l);
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (i === 0 && line.toLowerCase().startsWith('language')) {
              const match = line.match(/language[,\s]+(.+)/i);
              if (match) importedLanguage = match[1];
              continue;
            }
            if (line.toLowerCase().startsWith('id,text')) continue;
            const match = line.match(/^(\d+),(.*)$/);
            if (match) {
              let text = match[2];
              if (text.startsWith('"') && text.endsWith('"')) {
                text = text.slice(1, -1).replace(/""/g, '"');
              }
              importedData.push({ id: parseInt(match[1]), text });
            }
          }
        }

        // Создание или обновление файла
        let currentTbl = tblFile || createEmptyTBLFile();
        if (importedLanguage) currentTbl.setLanguage(importedLanguage);

        for (const item of importedData) {
          if (!currentTbl.entries.some(e => e.id === item.id)) {
            currentTbl.entries.push({ id: item.id, decrypted: encodeCP1251(item.text + '\0') });
          }
        }

        currentTbl.path = file.name;
        setTblFile(currentTbl);
        setFileName(file.name);
        setIsModified(true);
        refreshEntries(currentTbl);
        setFavorites(new Set());
        setShowFavoritesOnly(false);
        showNotification('success', `${t('imported')}: ${importedData.length}`);
      } catch (err: any) {
        showNotification('error', `${t('error')}: ${err.message}`);
      }

      setShowFileMenu(false);
      setShowImportSubmenu(false);
    };

    input.click();
  }, [tblFile, createEmptyTBLFile, refreshEntries, showNotification, t]);

  /**
   * Экспортировать файл
   */
  const handleExport = useCallback((format: string) => {
    if (!tblFile) return;

    let content = '';
    let mimeType = 'text/plain';
    let ext = format;

    if (format === 'json') {
      content = JSON.stringify({ language: tblFile.languageText, entries: tblFile.entries.map(e => ({ id: e.id, text: tblFile.getDisplayText(e) })) }, null, 2);
      mimeType = 'application/json';
    } else if (format === 'ini') {
      content = `language=${tblFile.languageText}\n` + tblFile.entries.map(e => `${e.id}=${tblFile.getDisplayText(e)}`).join('\n');
    } else if (format === 'yaml') {
      content = `language: ${tblFile.languageText}\n` + tblFile.entries.map(e => `${e.id}: ${tblFile.getDisplayText(e)}`).join('\n');
      ext = 'yml';
    } else if (format === 'toml') {
      content = `language = "${tblFile.languageText}"\n\n` + tblFile.entries.map(e => `[${e.id}]\ntext = "${tblFile.getDisplayText(e)}"\n`).join('\n');
    } else if (format === 'xml') {
      content = '<?xml version="1.0" encoding="UTF-8"?>\n<entries>\n';
      content += `  <language>${escapeXml(tblFile.languageText)}</language>\n`;
      content += tblFile.entries.map(e => `  <entry id="${e.id}">${escapeXml(tblFile.getDisplayText(e))}</entry>`).join('\n');
      content += '\n</entries>';
      mimeType = 'application/xml';
    } else if (format === 'csv') {
      content = `language,${tblFile.languageText}\n`;
      content += `id,text\n`;
      content += tblFile.entries.map(e => {
        const text = tblFile.getDisplayText(e);
        const escapedText = text.includes(',') || text.includes('"') || text.includes('\n')
          ? `"${text.replace(/"/g, '""')}"`
          : text;
        return `${e.id},${escapedText}`;
      }).join('\n');
      mimeType = 'text/csv';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName.replace('.tbl', '')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('success', `${t('exported')} ${format.toUpperCase()}`);
    setShowFileMenu(false);
    setShowExportSubmenu(false);
  }, [tblFile, fileName, showNotification, t]);

  // ============================================
  // СОРТИРОВКА И ФИЛЬТРАЦИЯ
  // ============================================

  /**
   * Обработать сортировку
   */
  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDirection('asc'); }
  }, [sortField]);

  /**
   * Отфильтрованные и отсортированные записи
   */
  const filteredAndSortedEntries = useMemo(() => {
    let result = [...entries];
    
    // Фильтр по поиску
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      result = result.filter(entry => entry.id.toString().includes(query) || entry.text.toLowerCase().includes(query));
    }
    
    // Фильтр по избранному
    if (showFavoritesOnly) {
      result = result.filter(entry => favorites.has(entry.index));
    }
    
    // Сортировка
    result.sort((a, b) => {
      const cmp = sortField === 'id' ? a.id - b.id : a.text.localeCompare(b.text, 'ru');
      return sortDirection === 'asc' ? cmp : -cmp;
    });
    
    return result;
  }, [entries, searchQuery, sortField, sortDirection, showFavoritesOnly, favorites]);

  // ============================================
  // РАБОТА С ЗАПИСЯМИ
  // ============================================

  /**
   * Открыть модальное окно для добавления
   */
  const openAddModal = useCallback(() => {
    setModalMode('add');
    setModalEntryId('');
    setModalEntryText('');
    setModalEditIndex(null);
    setShowModal(true);
  }, []);

  /**
   * Открыть модальное окно для редактирования
   */
  const openEditModal = useCallback((index: number) => {
    const entry = entries.find(e => e.index === index);
    if (!entry) return;
    setModalMode('edit');
    setModalEntryId(entry.id.toString());
    setModalEntryText(entry.text);
    setModalEditIndex(index);
    setShowModal(true);
  }, [entries]);

  /**
   * Сохранить изменения из модального окна
   */
  const handleModalSubmit = useCallback(() => {
    if (!tblFile) return;
    const id = parseInt(modalEntryId);
    if (isNaN(id)) { showNotification('error', t('id_must_be_number')); return; }

    if (modalMode === 'add') {
      if (tblFile.entries.some(e => e.id === id)) { showNotification('error', `${t('id')} ${id} ${t('already_exists')}`); return; }
      tblFile.entries.push({ id, decrypted: encodeCP1251(modalEntryText + '\0') });
      setIsModified(true);
      refreshEntries(tblFile);
      showNotification('success', t('added'));
    } else if (modalMode === 'edit' && modalEditIndex !== null) {
      const entry = tblFile.entries[modalEditIndex];
      if (entry.id !== id && tblFile.entries.some((e, i) => i !== modalEditIndex && e.id === id)) {
        showNotification('error', `${t('id')} ${id} ${t('already_exists')}`);
        return;
      }
      entry.id = id;
      tblFile.setText(entry, modalEntryText);
      setIsModified(true);
      refreshEntries(tblFile);
      showNotification('success', t('saved'));
    }
    setShowModal(false);
  }, [tblFile, modalMode, modalEntryId, modalEntryText, modalEditIndex, refreshEntries, showNotification, t]);

  /**
   * Удалить выбранные строки
   */
  const handleDeleteSelected = useCallback(() => {
    if (!tblFile || selectedRows.size === 0) return;
    const indicesToDelete = new Set(selectedRows);
    tblFile.entries = tblFile.entries.filter((_, i) => !indicesToDelete.has(i));
    setIsModified(true);
    refreshEntries(tblFile);
    setSelectedRows(new Set());
    
    // Обновить избранное
    const newFavorites = new Set<number>();
    let newIndex = 0;
    for (let i = 0; i < entries.length; i++) {
      if (!indicesToDelete.has(i) && favorites.has(i)) {
        newFavorites.add(newIndex);
      }
      if (!indicesToDelete.has(i)) newIndex++;
    }
    setFavorites(newFavorites);
    
    showNotification('success', `${t('deleted')}: ${indicesToDelete.size}`);
  }, [tblFile, selectedRows, refreshEntries, showNotification, t, entries, favorites]);

  /**
   * Удалить одну строку
   */
  const handleDeleteRow = useCallback((index: number) => {
    if (!tblFile) return;
    tblFile.entries.splice(index, 1);
    setIsModified(true);
    refreshEntries(tblFile);
    
    // Обновить избранное
    const newFavorites = new Set<number>();
    let newIndex = 0;
    for (let i = 0; i < entries.length; i++) {
      if (i !== index && favorites.has(i)) {
        newFavorites.add(newIndex);
      }
      if (i !== index) newIndex++;
    }
    setFavorites(newFavorites);
  }, [tblFile, refreshEntries, entries, favorites]);

  /**
   * Переключить выбор строки
   */
  const toggleRowSelection = useCallback((index: number) => {
    setSelectedRows(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }, []);

  /**
   * Выбрать все строки
   */
  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === filteredAndSortedEntries.length) setSelectedRows(new Set());
    else setSelectedRows(new Set(filteredAndSortedEntries.map(e => e.index)));
  }, [filteredAndSortedEntries, selectedRows]);

  /**
   * Изменить язык
   */
  const handleLanguageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!tblFile) return;
    tblFile.setLanguage(e.target.value);
    setLanguage(e.target.value);
    setIsModified(true);
  }, [tblFile]);

  /**
   * Переключить избранное для строки
   */
  const toggleFavorite = useCallback((index: number) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index); else next.add(index);
      return next;
    });
  }, []);

  /**
   * Переключить режим показа только избранного
   */
  const toggleShowFavorites = useCallback(() => {
    setShowFavoritesOnly(prev => !prev);
  }, []);

  // ============================================
  // ЭФФЕКТЫ
  // ============================================

  /**
   * Обработка клавиш
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowModal(false);
        setShowFileMenu(false);
        setShowImportSubmenu(false);
        setShowExportSubmenu(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // ============================================
  // РЕНДЕР
  // ============================================

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Уведомления */}
      {notification && (
        <div className="fixed top-4 right-4 z-50 animate-slide-in">
          <div className={`px-4 py-2.5 rounded-md border text-sm font-medium backdrop-blur-sm ${
            notification.type === 'success' ? 'border-[var(--border-strong)] text-[var(--text-primary)]' :
            notification.type === 'error' ? 'border-[var(--error)] text-[var(--error)]' :
            'border-[var(--border-strong)] text-[var(--text-primary)]'
          }`} style={{ backgroundColor: 'var(--bg-secondary)' }}>
            {notification.message}
          </div>
        </div>
      )}

      {/* Верхняя панель */}
      <div className="border-b" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="w-full px-6 py-3 flex items-center gap-4">
          {/* Меню файла */}
          <div ref={menuRef} className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowFileMenu(!showFileMenu);
                setShowImportSubmenu(false);
                setShowExportSubmenu(false);
              }}
              className="px-3 py-1.5 text-sm transition-colors"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
              onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
            >
              {t('file')}
            </button>

            {showFileMenu && (
              <div className="absolute top-full left-0 mt-1 w-48 rounded-md shadow-xl py-1 z-40" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={handleCreateNew}
                  className="w-full px-3 py-2 text-left text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  {t('create')}
                </button>
                <button
                  onClick={() => { fileInputRef.current?.click(); setShowFileMenu(false); }}
                  className="w-full px-3 py-2 text-left text-sm transition-colors"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  {t('open')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={!tblFile}
                  className="w-full px-3 py-2 text-left text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  {t('save')}
                </button>
                <div className="my-1" style={{ borderTop: '1px solid var(--border-subtle)' }}></div>
                <button
                  ref={importBtnRef}
                  onClick={() => {
                    const isOpening = !showImportSubmenu;
                    setShowImportSubmenu(isOpening);
                    setShowExportSubmenu(false);
                    if (isOpening && importBtnRef.current) {
                      const rect = importBtnRef.current.getBoundingClientRect();
                      setImportSubmenuPos({ top: rect.top, left: rect.right + 4 });
                    }
                  }}
                  className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  {t('import')}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
                <button
                  ref={exportBtnRef}
                  onClick={() => {
                    const isOpening = !showExportSubmenu;
                    setShowExportSubmenu(isOpening);
                    setShowImportSubmenu(false);
                    if (isOpening && exportBtnRef.current) {
                      const rect = exportBtnRef.current.getBoundingClientRect();
                      setExportSubmenuPos({ top: rect.top, left: rect.right + 4 });
                    }
                  }}
                  disabled={!tblFile}
                  className="w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between disabled:opacity-40 disabled:cursor-not-allowed"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => { if (!e.currentTarget.disabled) { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; } }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
                >
                  {t('export')}
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            )}
          </div>

          {/* Имя файла */}
          {fileName && (
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: 'var(--text-muted)' }}>{fileName}</span>
              {isModified && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--warning)' }}></span>}
            </div>
          )}

          <div className="flex-1" />

          {/* Переключатель языка интерфейса */}
          <LanguageSelector
            currentLang={currentLang}
            availableLangs={availableLangs}
            onChange={setCurrentLang}
          />

          {/* Переключатель темы */}
          <ThemeToggle />
        </div>
      </div>

      {/* Панель инструментов */}
      <div className="w-full px-6 py-4">
        <div className="flex items-center gap-3">
          {/* Поле языка */}
          {tblFile && (
            <>
              <label className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{t('language')}</label>
              <input
                type="text"
                value={language}
                onChange={handleLanguageChange}
                className="w-40 px-3 py-1.5 rounded-md text-sm focus:outline-none transition-colors"
                style={{ 
                  backgroundColor: 'var(--bg-secondary)', 
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
                onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
              />
              <div className="w-px h-6" style={{ backgroundColor: 'var(--border-subtle)' }}></div>
            </>
          )}

          {/* Поиск */}
          <div className="relative flex-1 max-w-md">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('search_placeholder')}
              className="w-full pl-9 pr-4 py-2 rounded-md text-sm focus:outline-none transition-colors"
              style={{ 
                backgroundColor: 'var(--bg-secondary)', 
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
              onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Кнопки действий */}
          <button
            onClick={openAddModal}
            disabled={!tblFile}
            className="px-3 py-2 rounded-md text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            style={{ 
              color: 'var(--text-secondary)',
              border: '1px solid transparent'
            }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {t('add')}
          </button>
          <button
            onClick={handleDeleteSelected}
            disabled={!tblFile || selectedRows.size === 0}
            className="px-3 py-2 rounded-md text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
            style={{ 
              color: 'var(--text-secondary)',
              border: '1px solid transparent'
            }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; } }}
            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            {t('delete')}{selectedRows.size > 0 && ` (${selectedRows.size})`}
          </button>
          <button
            onClick={toggleShowFavorites}
            disabled={!tblFile}
            className={`px-3 py-2 rounded-md text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 ${
              showFavoritesOnly ? 'bg-[var(--accent)] text-white' : ''
            }`}
            style={{ 
              color: showFavoritesOnly ? 'white' : 'var(--text-secondary)',
              backgroundColor: showFavoritesOnly ? 'var(--accent)' : 'transparent',
              border: '1px solid transparent'
            }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled && !showFavoritesOnly) { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; e.currentTarget.style.borderColor = 'var(--border-subtle)'; } }}
            onMouseLeave={(e) => { if (!showFavoritesOnly) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.borderColor = 'transparent'; } }}
          >
            <svg className="w-4 h-4" fill={showFavoritesOnly ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
            </svg>
            {t('favorites')}
          </button>
        </div>
      </div>

      {/* Скрытый input для файла */}
      <input ref={fileInputRef} type="file" accept=".tbl" onChange={handleFileOpen} className="hidden" />

      {/* Таблица */}
      <div className="w-full px-6 pb-8">
        {!tblFile ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ border: '1px solid var(--border-subtle)' }}>
              <svg className="w-7 h-7" style={{ color: 'var(--text-muted)' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-medium mb-1" style={{ color: 'var(--text-primary)' }}>{t('no_file')}</h2>
            <p className="text-sm mb-6" style={{ color: 'var(--text-muted)' }}>{t('no_file_description')}</p>
            <div className="flex gap-2">
              <button
                onClick={handleCreateNew}
                className="px-4 py-2 rounded-md text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                {t('create')}
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-md text-sm transition-colors"
                style={{ 
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {t('open')}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded-md overflow-hidden" style={{ border: '1px solid var(--border-subtle)', backgroundColor: 'var(--bg-secondary)' }}>
            {/* Заголовок таблицы */}
            <div className="grid grid-cols-[auto_140px_1fr_120px]" style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="px-3 py-3 flex items-center">
                <input
                  type="checkbox"
                  checked={selectedRows.size === filteredAndSortedEntries.length && filteredAndSortedEntries.length > 0}
                  onChange={handleSelectAll}
                  className="w-3.5 h-3.5 cursor-pointer"
                />
              </div>
              <button
                onClick={() => handleSort('id')}
                className="px-3 py-3 text-left text-sm uppercase tracking-wider transition-colors flex items-center gap-1.5 font-medium"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                {t('id')}
                {sortField === 'id' && (
                  <svg className={`w-3.5 h-3.5 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                )}
              </button>
              <button
                onClick={() => handleSort('name')}
                className="px-3 py-3 text-left text-sm uppercase tracking-wider transition-colors flex items-center gap-1.5 font-medium"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                {t('text')}
                {sortField === 'name' && (
                  <svg className={`w-3.5 h-3.5 transition-transform ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                  </svg>
                )}
              </button>
              <div className="px-4 py-3 text-sm uppercase tracking-wider text-center font-medium" style={{ color: 'var(--text-muted)' }}>
                {t('actions')}
              </div>
            </div>

            {/* Тело таблицы */}
            <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
              {filteredAndSortedEntries.length === 0 ? (
                <div className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
                  {searchQuery ? t('no_results') : showFavoritesOnly ? t('no_favorites') : t('no_entries')}
                </div>
              ) : (
                filteredAndSortedEntries.map((entry) => (
                  <div
                    key={entry.index}
                    className="grid grid-cols-[auto_140px_1fr_120px] border-b transition-colors cursor-pointer"
                    style={{ 
                      borderColor: 'var(--border-subtle)',
                      backgroundColor: selectedRows.has(entry.index) ? 'var(--bg-tertiary)' : 'transparent'
                    }}
                    onDoubleClick={() => openEditModal(entry.index)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = selectedRows.has(entry.index) ? 'var(--bg-tertiary)' : 'transparent'}
                  >
                    <div className="px-3 py-3 flex items-center">
                      <input
                        type="checkbox"
                        checked={selectedRows.has(entry.index)}
                        onChange={(e) => { e.stopPropagation(); toggleRowSelection(entry.index); }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-3.5 h-3.5 cursor-pointer"
                      />
                    </div>
                    <div className="px-3 py-3 text-base font-mono" style={{ color: 'var(--text-secondary)' }}>
                      <span className="truncate">{entry.id}</span>
                    </div>
                    <div className="px-3 py-3 text-base" style={{ color: 'var(--text-primary)' }}>
                      <span className="truncate">{entry.text || <span style={{ color: 'var(--text-muted)' }} className="italic">{t('empty')}</span>}</span>
                    </div>
                    <div className="px-4 py-3 flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditModal(entry.index); }}
                        className="p-2 rounded transition-all"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                        title={t('edit')}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteRow(entry.index); }}
                        className="p-2 rounded transition-all"
                        style={{ color: 'var(--text-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--error)'; e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
                        title={t('delete')}
                      >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(entry.index); }}
                        className="p-2 rounded transition-all"
                        style={{ color: favorites.has(entry.index) ? 'var(--warning)' : 'var(--text-muted)' }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-elevated)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                        title={t('add_to_favorites')}
                      >
                        <svg className="w-5 h-5" fill={favorites.has(entry.index) ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Подвал таблицы */}
            <div className="px-4 py-2 flex items-center justify-between text-xs" style={{ backgroundColor: 'var(--bg-tertiary)', borderTop: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
              <span>
                {entries.length} {entries.length === 1 ? t('record') : t('records')}
                {searchQuery && ` · ${t('shown')}: ${filteredAndSortedEntries.length}`}
                {showFavoritesOnly && ` · ${t('favorites')}: ${favorites.size}`}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>{t('double_click_edit')}</span>
            </div>
          </div>
        )}
      </div>

      {/* Подменю импорта */}
      {showImportSubmenu && createPortal(
        <div
          className="fixed w-32 rounded-md shadow-xl py-1 z-[100]"
          style={{ top: importSubmenuPos.top, left: importSubmenuPos.left, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
        >
          {['json', 'ini', 'yaml', 'toml', 'xml', 'csv'].map(format => (
            <button
              key={format}
              onClick={() => handleImport(format)}
              className="w-full px-3 py-1.5 text-left text-sm transition-colors uppercase"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              {format}
            </button>
          ))}
        </div>,
        document.body
      )}

      {/* Подменю экспорта */}
      {showExportSubmenu && createPortal(
        <div
          className="fixed w-32 rounded-md shadow-xl py-1 z-[100]"
          style={{ top: exportSubmenuPos.top, left: exportSubmenuPos.left, backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}
        >
          {['json', 'ini', 'yaml', 'toml', 'xml', 'csv'].map(format => (
            <button
              key={format}
              onClick={() => handleExport(format)}
              className="w-full px-3 py-1.5 text-left text-sm transition-colors uppercase"
              style={{ color: 'var(--text-secondary)' }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; e.currentTarget.style.color = 'var(--text-primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--text-secondary)'; }}
            >
              {format}
            </button>
          ))}
        </div>,
        document.body
      )}

      {/* Модальное окно */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-fade-in" style={{ backgroundColor: 'rgba(0, 0, 0, 0.6)' }}>
          <div className="w-full max-w-md mx-4 rounded-lg shadow-2xl" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
            <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <h3 className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                {modalMode === 'add' ? t('new_entry') : t('edit_entry')}
              </h3>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{t('id')}</label>
                <input
                  type="number"
                  value={modalEntryId}
                  onChange={(e) => setModalEntryId(e.target.value)}
                  placeholder={t('unique_id')}
                  className="w-full px-3 py-2 rounded-md text-sm focus:outline-none transition-colors"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-muted)' }}>{t('text')}</label>
                <textarea
                  value={modalEntryText}
                  onChange={(e) => setModalEntryText(e.target.value)}
                  placeholder={t('entry_text')}
                  rows={4}
                  className="w-full px-3 py-2 rounded-md text-sm focus:outline-none transition-colors resize-none"
                  style={{ 
                    backgroundColor: 'var(--bg-primary)', 
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                  onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
                />
              </div>
            </div>
            <div className="px-5 py-3 flex items-center justify-end gap-2" style={{ borderTop: '1px solid var(--border-subtle)' }}>
              <button
                onClick={() => setShowModal(false)}
                className="px-3 py-1.5 rounded-md text-sm transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--text-primary)'; e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-secondary)'; e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                {t('cancel')}
              </button>
              <button
                onClick={handleModalSubmit}
                className="px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                style={{ backgroundColor: 'var(--text-primary)', color: 'var(--bg-primary)' }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
              >
                {modalMode === 'add' ? t('add') : t('save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Экранирование XML символов
 */
function escapeXml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export default App;
