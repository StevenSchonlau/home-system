import { Threshold } from '../dashboard.models';

// ok = inside limits (green), warn = amber, alert = red. 'normal' = no special color.
export type ValueStatus = 'normal' | 'ok' | 'warn' | 'alert';

const WARN_FRACTION = 0.1;

// Amber 1–2σ from the mean, red beyond 2σ.
export function stdDevStatus(value: number, history: number[]): ValueStatus {
  if (history.length < 2) {
    return 'normal';
  }
  const mean = history.reduce((sum, v) => sum + v, 0) / history.length;
  const sd = Math.sqrt(history.reduce((sum, v) => sum + (v - mean) ** 2, 0) / history.length);
  if (sd === 0) {
    return 'normal';
  }
  const distance = Math.abs(value - mean) / sd;
  return distance > 2 ? 'alert' : distance > 1 ? 'warn' : 'normal';
}

// Red past a limit, amber within 10% of one, green otherwise.
// The 10% is of the min–max span, or of the limit itself when only one is set.
export function thresholdStatus(value: number, { min, max }: Threshold): ValueStatus {
  const hasMin = min !== undefined;
  const hasMax = max !== undefined;
  if (!hasMin && !hasMax) {
    return 'normal';
  }
  if ((hasMin && value < min) || (hasMax && value > max)) {
    return 'alert';
  }
  const zone = (limit: number) =>
    WARN_FRACTION * (hasMin && hasMax ? max - min : Math.abs(limit));
  if ((hasMin && value - min <= zone(min)) || (hasMax && max - value <= zone(max))) {
    return 'warn';
  }
  return 'ok';
}
