import { moveItemInArray } from '@angular/cdk/drag-drop';
import { computed, inject, Injectable, signal } from '@angular/core';
import { AccountService } from '../account.service';
import { DashboardConfig, DashboardTileConfig } from './dashboard.models';

const STORAGE_PREFIX = 'dashboard-config:';
// Before layouts were per account, one shared layout lived here. It is discarded.
const LEGACY_STORAGE_KEY = 'dashboard-config';

// Holds one dashboard layout per account and saves every change to localStorage
// (key "dashboard-config:<account>"). An account with nothing saved starts empty.
// Will come from a database later.
@Injectable({ providedIn: 'root' })
export class DashboardConfigService {
  private readonly accounts = inject(AccountService);
  // Layouts loaded or changed this session, by account.
  private readonly layouts = signal<Record<string, DashboardConfig>>({});

  // The selected account's layout.
  readonly config = computed(() => {
    const account = this.accounts.selected();
    return this.layouts()[account] ?? loadConfig(account);
  });

  constructor() {
    try {
      localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // Storage unavailable: nothing to clean up.
    }
  }

  tile(id: string): DashboardTileConfig | undefined {
    return this.config().tiles.find((tile) => tile.id === id);
  }

  set(config: DashboardConfig): void {
    this.write(() => config);
  }

  addTile(tile: DashboardTileConfig): void {
    this.write(({ tiles }) => ({ tiles: [...tiles, tile] }));
  }

  updateTile(tile: DashboardTileConfig): void {
    this.write(({ tiles }) => ({ tiles: tiles.map((t) => (t.id === tile.id ? tile : t)) }));
  }

  removeTile(id: string): void {
    this.write(({ tiles }) => ({ tiles: tiles.filter((tile) => tile.id !== id) }));
  }

  moveTile(fromIndex: number, toIndex: number): void {
    this.write(({ tiles }) => {
      const next = [...tiles];
      moveItemInArray(next, fromIndex, toIndex);
      return { tiles: next };
    });
  }

  private write(change: (config: DashboardConfig) => DashboardConfig): void {
    const account = this.accounts.selected();
    const next = change(this.config());
    this.layouts.update((all) => ({ ...all, [account]: next }));
    try {
      localStorage.setItem(storageKey(account), JSON.stringify(next));
    } catch {
      // Storage unavailable (e.g. private mode): the layout still works for this session.
    }
  }
}

export function storageKey(account: string): string {
  return STORAGE_PREFIX + account;
}

function loadConfig(account: string): DashboardConfig {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(account)) ?? 'null');
    if (Array.isArray(saved?.tiles)) {
      return saved as DashboardConfig;
    }
  } catch {
    // Missing, unreadable or corrupt: fall through to an empty dashboard.
  }
  return { tiles: [] };
}
