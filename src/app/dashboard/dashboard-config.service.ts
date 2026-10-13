import { moveItemInArray } from '@angular/cdk/drag-drop';
import { Injectable, signal } from '@angular/core';
import defaultConfig from './dashboard-config.json';
import { DashboardConfig, DashboardTileConfig } from './dashboard.models';

// Holds the dashboard layout so it survives navigating between dashboard pages.
// Stubbed from a local .json file; will come from a database later.
@Injectable({ providedIn: 'root' })
export class DashboardConfigService {
  private readonly config_ = signal<DashboardConfig>(defaultConfig as DashboardConfig);
  readonly config = this.config_.asReadonly();

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
