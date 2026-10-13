import { Component, input } from '@angular/core';
import { TileSize } from '../dashboard.models';

// A sized frame. Whatever is placed inside <app-dashboard-tile> is rendered as its content.
@Component({
  imports: [],
  selector: 'app-dashboard-tile',
  styleUrl: './dashboard-tile.css',
  templateUrl: './dashboard-tile.html',
  host: {
    '[class.size-1x1]': "size() === '1x1'",
    '[class.size-1x2]': "size() === '1x2'",
    '[class.size-1x3]': "size() === '1x3'",
  },
})
export class DashboardTile {
  readonly size = input.required<TileSize>();
}
