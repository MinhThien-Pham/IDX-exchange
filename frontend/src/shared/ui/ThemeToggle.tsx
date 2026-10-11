import { Moon, Sun } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';

type Theme = 'light' | 'dark';
const storageKey = 'idx-theme';
function savedTheme(): Theme | null {
  try {
    const value = localStorage.getItem(storageKey);
    return value === 'light' || value === 'dark' ? value : null;
  } catch {
    return null;
  }
}

export default function ThemeToggle() {
  const explicit = useRef(Boolean(savedTheme()));
  const [theme, setTheme] = useState<Theme>(
    () =>
      savedTheme() ??
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'),
  );
  useLayoutEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
  }, [theme]);
  useEffect(() => {
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const followSystem = () => {
      if (!explicit.current) setTheme(media.matches ? 'dark' : 'light');
    };
    media.addEventListener('change', followSystem);
    return () => media.removeEventListener('change', followSystem);
  }, []);

  return (
    <button
      type="button"
      className="theme-toggle"
      role="switch"
      aria-label="Dark theme"
      aria-checked={theme === 'dark'}
      onClick={() => {
        const next = theme === 'dark' ? 'light' : 'dark';
        explicit.current = true;
        setTheme(next);
        try {
          localStorage.setItem(storageKey, next);
        } catch {
          // Theme switching also works when browser storage is unavailable.
        }
      }}
    >
      {theme === 'dark' ? <Moon aria-hidden="true" /> : <Sun aria-hidden="true" />}
      <span className="theme-label">{theme === 'dark' ? 'Dark' : 'Light'}</span>
      <span className="theme-track" aria-hidden="true" />
    </button>
  );
}
