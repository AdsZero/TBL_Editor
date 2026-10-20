import { useState, useEffect } from 'react';

interface Localization {
  [key: string]: string;
}

export function useLocalization() {
  const [localization, setLocalization] = useState<Localization>({});
  const [currentLang, setCurrentLang] = useState<string>(() => {
    return localStorage.getItem('language') || 'ru';
  });
  const [availableLangs, setAvailableLangs] = useState<string[]>(['ru', 'en']);

  useEffect(() => {
    loadManifest();
  }, []);

  useEffect(() => {
    loadLocalization(currentLang);
  }, [currentLang]);

  const loadManifest = async () => {
    try {
      const response = await fetch('/localization/manifest.json');
      if (response.ok) {
        const data = await response.json();
        if (data.languages && Array.isArray(data.languages)) {
          setAvailableLangs(data.languages);
        }
      }
    } catch (error) {
      console.error('Failed to load manifest:', error);
    }
  };

  const loadLocalization = async (lang: string) => {
    try {
      const response = await fetch(`/localization/${lang}.json`);
      if (response.ok) {
        const data = await response.json();
        setLocalization(data);
      }
    } catch (error) {
      console.error('Failed to load localization:', error);
    }
  };

  const t = (key: string): string => {
    return localization[key] || key;
  };

  return {
    t,
    currentLang,
    setCurrentLang: (lang: string) => {
      setCurrentLang(lang);
      localStorage.setItem('language', lang);
    },
    availableLangs,
  };
}
