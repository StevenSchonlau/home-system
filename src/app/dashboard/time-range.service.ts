import { effect, Injectable, signal } from '@angular/core';

export type TimeUnit = 'minutes' | 'hours' | 'days' | 'weeks';
export const TIME_UNITS: TimeUnit[] = ['minutes', 'hours', 'days', 'weeks'];

const UNIT_MS: Record<TimeUnit, number> = {
  minutes: 60_000,
  hours: 3_600_000,
  days: 86_400_000,
  weeks: 604_800_000,
};

// Both modes' values are kept so switching back and forth doesn't lose them.
export interface TimeRange {
  mode: 'last' | 'custom';
  amount: number;
  unit: TimeUnit;
  start: string; // datetime-local value ("2026-10-13T08:00"), '' = no lower limit
  end: string; // '' = no upper limit
}

const STORAGE_KEY = 'dashboard-time-range';
const DEFAULT_RANGE: TimeRange = { mode: 'last', amount: 24, unit: 'hours', start: '', end: '' };

// The time window applied to every dashboard graph. Saved to localStorage.
@Injectable({ providedIn: 'root' })
export class TimeRangeService {
  private readonly range_ = signal<TimeRange>(loadRange());
  readonly range = this.range_.asReadonly();

  constructor() {
    effect(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.range_()));
      } catch {
        // Storage unavailable: the range lasts for this session only.
      }
    });
  }

  update(changes: Partial<TimeRange>): void {
    this.range_.update((range) => ({ ...range, ...changes }));
  }

  // Current window in epoch ms. "Last N" is measured back from now, so call this when rendering.
  bounds(): { from: number; to: number } {
    const range = this.range_();
    if (range.mode === 'last') {
      const to = Date.now();
      return { from: to - range.amount * UNIT_MS[range.unit], to };
    }
    return {
      from: range.start ? new Date(range.start).getTime() : -Infinity,
      to: range.end ? new Date(range.end).getTime() : Infinity,
    };
  }
}

function loadRange(): TimeRange {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (saved && typeof saved === 'object') {
      return { ...DEFAULT_RANGE, ...saved };
    }
  } catch {
    // Missing or corrupt: use the default.
  }
  return DEFAULT_RANGE;
}
