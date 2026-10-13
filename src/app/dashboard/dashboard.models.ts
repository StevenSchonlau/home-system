// Width of a tile in a 3-column grid: 1x1 = one column, 1x3 = full width.
export type TileSize = '1x1' | '1x2' | '1x3';

export interface DashboardTileConfig {
  id: string;
  size: TileSize;
  // 1-3 sensor series keys ("sensorType:DataKey") shown in this tile.
  fields: string[];
  // 1x3 tiles only: show the graph in the tile instead of the latest values.
  showGraph?: boolean;
}

// Array order is the display order. This is the shape that is exported/imported as JSON.
export interface DashboardConfig {
  tiles: DashboardTileConfig[];
}
