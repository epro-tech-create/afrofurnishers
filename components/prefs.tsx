'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { t, type Copy, type Theme } from '@/lib/i18n';

interface Prefs {
  theme: Theme;
  t: Copy;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const PrefsContext = createContext<Prefs | null>(null);

export function PrefsProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('light');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setThemeState('light');
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = 'en';
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem('afro-theme', theme);
      localStorage.removeItem('afro-locale');
    } catch { /* Session still works. */ }
  }, [theme, ready]);

  return (
    <PrefsContext.Provider
      value={{
        theme,
        t,
        setTheme: setThemeState,
        toggleTheme: () => setThemeState(current => (current === 'light' ? 'dark' : 'light')),
      }}
    >
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  const prefs = useContext(PrefsContext);
  if (!prefs) throw new Error('PrefsProvider required');
  return prefs;
}
