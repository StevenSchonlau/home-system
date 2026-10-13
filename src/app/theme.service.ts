import { Injectable, signal } from '@angular/core';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

// Follows the OS/browser setting until the user picks one with toggle(), which is remembered.
@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly theme_ = signal<Theme>(initialTheme());
  readonly theme = this.theme_.asReadonly();

  constructor() {
    applyTheme(this.theme_());
  }

  toggle(): void {
    const next: Theme = this.theme_() === 'dark' ? 'light' : 'dark';
    applyTheme(next);
    this.theme_.set(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable: the choice lasts for this session only.
    }
  }
}

function initialTheme(): Theme {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // Fall back to the system setting.
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset['theme'] = theme;
}
