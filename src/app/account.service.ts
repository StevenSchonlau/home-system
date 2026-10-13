import { effect, Injectable, signal } from '@angular/core';

// Account shown until the user picks another one from the dropdown.
export const DEFAULT_ACCOUNT_NAME = 'Steven';

const STORAGE_KEY = 'dashboard-account';

// Which accountName the dashboard shows. Remembered in localStorage.
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly selected_ = signal(loadAccount());
  readonly selected = this.selected_.asReadonly();
  // Every accountName seen in the sensor data; filled in by SensorDataService.
  readonly available = signal<string[]>([]);

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, this.selected_());
      } catch {
        // Storage unavailable: the choice lasts for this session only.
      }
    });
  }

  select(account: string): void {
    this.selected_.set(account);
  }
}

function loadAccount(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || DEFAULT_ACCOUNT_NAME;
  } catch {
    return DEFAULT_ACCOUNT_NAME;
  }
}
