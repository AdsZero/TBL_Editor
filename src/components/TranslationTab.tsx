interface Props {
  entries: { id: number; text: string }[];
  targetLanguage: string;
  onTargetLanguageChange: (language: string) => void;
  sortField: 'id' | 'name';
  sortDirection: 'asc' | 'desc';
  onSort: (field: 'id' | 'name') => void;
  translations: Record<number, string>;
  onTranslationChange: (id: number, text: string) => void;
  onSave: () => void;
  t: (key: string) => string;
}

export default function TranslationTab({
  entries,
  targetLanguage,
  onTargetLanguageChange,
  sortField,
  sortDirection,
  onSort,
  translations,
  onTranslationChange,
  onSave,
  t,
}: Props) {
  const SortIcon = ({ field }: { field: 'id' | 'name' }) => (
    <svg className={`w-3 h-3 transition-transform ${sortField === field ? 'opacity-100' : 'opacity-0'} ${sortDirection === 'desc' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
    </svg>
  );

  return (
    <div className="space-y-4">
      <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
          {t('translation_language')}
        </label>
        <input
          type="text"
          value={targetLanguage}
          onChange={(e) => onTargetLanguageChange(e.target.value)}
          placeholder={t('language_placeholder')}
          className="w-full px-4 py-2.5 rounded-lg text-sm focus:outline-none transition-all"
          style={{ 
            backgroundColor: 'var(--bg-tertiary)', 
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)'
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 1px var(--accent)'; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
      </div>

      <div className="rounded-xl overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
        <div className="grid grid-cols-[120px_1fr_1fr]" style={{ backgroundColor: 'var(--bg-tertiary)', borderBottom: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => onSort('id')}
            className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-2"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-primary)'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
          >
            {t('id')}
            <SortIcon field="id" />
          </button>
          <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            {t('original')}
          </div>
          <div className="px-4 py-3 text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
            {t('translation')}
          </div>
        </div>

        <div className="max-h-[calc(100vh-500px)] overflow-y-auto">
          {entries.length === 0 ? (
            <div className="py-16 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
              {t('no_entries')}
            </div>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                className="grid grid-cols-[120px_1fr_1fr] transition-colors"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              >
                <div className="px-4 py-3 flex items-center text-sm font-mono" style={{ color: 'var(--text-secondary)' }}>
                  {entry.id}
                </div>
                <div className="px-4 py-3 flex items-center text-sm" style={{ color: 'var(--text-primary)' }}>
                  <span className="truncate">{entry.text}</span>
                </div>
                <div className="px-4 py-3">
                  <input
                    type="text"
                    value={translations[entry.id] || ''}
                    onChange={(e) => onTranslationChange(entry.id, e.target.value)}
                    placeholder={t('translation_placeholder')}
                    className="w-full px-3 py-1.5 rounded-lg text-sm focus:outline-none transition-all"
                    style={{ 
                      backgroundColor: 'var(--bg-tertiary)', 
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)'
                    }}
                    onFocus={(e) => { e.currentTarget.style.borderColor = 'var(--accent)'; e.currentTarget.style.boxShadow = '0 0 0 1px var(--accent)'; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.boxShadow = 'none'; }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div className="px-4 py-3 flex items-center justify-between" style={{ backgroundColor: 'var(--bg-tertiary)', borderTop: '1px solid var(--border-subtle)' }}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {entries.length} {entries.length === 1 ? t('record') : t('records')} · {t('translated')}: {Object.keys(translations).length}
          </span>
          <button
            onClick={onSave}
            disabled={!targetLanguage || Object.keys(translations).length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-lg disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ 
              backgroundColor: 'var(--accent)', 
              color: 'white',
              boxShadow: '0 4px 6px -1px rgba(139, 92, 246, 0.2)'
            }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.backgroundColor = 'var(--accent-hover)'; }}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--accent)'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {t('save_translation')}
          </button>
        </div>
      </div>
    </div>
  );
}
