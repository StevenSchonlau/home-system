import { moveItemInArray } from '@angular/cdk/drag-drop';
import { effect, Injectable, signal } from '@angular/core';
import { DashboardConfig, DashboardTileConfig } from './dashboard.models';

const STORAGE_KEY = 'dashboard-config';

// Holds the dashboard layout and saves every change to localStorage.
// Starts empty when nothing is saved. Will come from a database later.
@Injectable({ providedIn: 'root' })
export class DashboardConfigService {
  private readonly config_ = signal<DashboardConfig>(loadConfig());
  readonly config = this.config_.asReadonly();

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.config_()));
      } catch {
        // Storage unavailable (e.g. private mode): the layout still works for this session.
      }
    });
  }

  set(config: DashboardConfig): void {
    this.config_.set(config);
  }

  addTile(tile: DashboardTileConfig): void {
    this.config_.update(({ tiles }) => ({ tiles: [...tiles, tile] }));
  }

  removeTile(id: string): void {
    this.config_.update(({ tiles }) => ({ tiles: tiles.filter((tile) => tile.id !== id) }));
  }

  moveTile(fromIndex: number, toIndex: number): void {
    const tiles = [...this.config_().tiles];
    moveItemInArray(tiles, fromIndex, toIndex);
    this.config_.set({ tiles });
  }
}

function loadConfig(): DashboardConfig {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (Array.isArray(saved?.tiles)) {
      return saved as DashboardConfig;
    }
  } catch {
    // Missing, unreadable or corrupt: fall through to an empty dashboard.
  }
  return { tiles: [] };
}
