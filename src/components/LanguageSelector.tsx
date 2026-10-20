interface Props {
  currentLang: string;
  availableLangs: string[];
  onChange: (lang: string) => void;
}

export default function LanguageSelector({ currentLang, availableLangs, onChange }: Props) {
  return (
    <select
      value={currentLang}
      onChange={(e) => onChange(e.target.value)}
      className="px-3 py-1.5 rounded-md text-sm cursor-pointer transition-colors focus:outline-none"
      style={{ 
        backgroundColor: 'var(--bg-secondary)', 
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-secondary)'
      }}
      onFocus={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
      onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border-subtle)'}
    >
      {availableLangs.map(lang => (
        <option key={lang} value={lang} style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
          {lang.toUpperCase()}
        </option>
      ))}
    </select>
  );
}
