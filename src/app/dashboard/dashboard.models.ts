// Width of a tile in a 3-column grid: 1x1 = one column, 1x3 = full width.
export type TileSize = '1x1' | '1x2' | '1x3';

// What a tile shows:
//   values: latest reading per entry     line: numbers over time (text entries fall back to bar)
//   bar / pie: how often each value appears     stats: min / max / avg / std dev...
export type TileDisplay = 'values' | 'line' | 'bar' | 'pie' | 'stats';
export type ChartKind = 'line' | 'bar' | 'pie';

// How a value tile colors its numbers (one mode per tile).
//   stdDev:     amber 1–2σ from the mean, red beyond 2σ (mean/σ over the selected time range)
//   thresholds: green inside, amber near a limit, red + ⚠ past it (limits per entry)
export type ColorMode = 'none' | 'stdDev' | 'thresholds';

export interface Threshold {
  min?: number;
  max?: number;
}

export interface DashboardTileConfig {
  id: string;
  size: TileSize;
  // 1-3 sensor series keys ("sensorType:DataKey") shown in this tile.
  fields: string[];
  display?: TileDisplay | 'graph'; // default 'values'; 'graph' is from older layouts
  // Older layouts: showGraph (= display 'graph') and chartType ('pie' made text values a pie).
  showGraph?: boolean;
  chartType?: 'bar' | 'pie';
  // 'values' display only:
  colorMode?: ColorMode; // default 'none'
  thresholds?: Record<string, Threshold>; // by field key, used when colorMode is 'thresholds'
  showTrend?: boolean; // sparkline next to each number
}

// Array order is the display order. This is the shape that is exported/imported as JSON.
export interface DashboardConfig {
  tiles: DashboardTileConfig[];
}

export function tileDisplay(tile: DashboardTileConfig): TileDisplay {
  if (tile.display === 'graph' || (!tile.display && tile.showGraph)) {
    return tile.chartType === 'pie' ? 'pie' : 'line';
  }
  return tile.display ?? 'values';
}

// The chart to draw for a tile (value and stats tiles open a line chart on the graph page).
export function chartKind(tile: DashboardTileConfig): ChartKind {
  const display = tileDisplay(tile);
  return display === 'bar' || display === 'pie' ? display : 'line';
}
