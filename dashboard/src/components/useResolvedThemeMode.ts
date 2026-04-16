import { useEffect, useState } from 'react';

type ThemeMode = 'light' | 'dark' | 'auto';

function getRgbValues(color: string) {
  const match = color.match(/\d+/g);

  if (!match || match.length < 3) {
    return null;
  }

  return match.slice(0, 3).map(Number);
}

function getSurfaceMode(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }

  const background =
    window.getComputedStyle(document.body).backgroundColor ||
    window.getComputedStyle(document.documentElement).backgroundColor;
  const rgb = getRgbValues(background);

  if (!rgb) {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light';
  }

  const [r, g, b] = rgb;
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return luminance < 0.5 ? 'dark' : 'light';
}

export default function useResolvedThemeMode(themeMode: ThemeMode) {
  const [resolvedThemeMode, setResolvedThemeMode] = useState<'light' | 'dark'>(
    themeMode === 'auto' ? getSurfaceMode() : themeMode
  );

  useEffect(() => {
    if (themeMode !== 'auto') {
      setResolvedThemeMode(themeMode);
      return;
    }

    const syncThemeMode = () => {
      setResolvedThemeMode(getSurfaceMode());
    };

    syncThemeMode();

    const observer = new MutationObserver(syncThemeMode);
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['style', 'class'],
    });

    return () => observer.disconnect();
  }, [themeMode]);

  return resolvedThemeMode;
}
