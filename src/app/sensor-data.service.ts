import { HttpClient } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, Observable, of, switchMap, timer } from 'rxjs';
import { createMockApi } from './sensor-data.mock';

// TODO: replace with the real endpoint, then set USE_MOCK_DATA to false.
export const API_URL = 'https://example.com/api/sensor-readings';
export const USE_MOCK_DATA = true;
// Only readings for this account are used (exact, case-sensitive match).
export const ACCOUNT_NAME = 'home';
const POLL_INTERVAL_MS = 30_000;

// One row from the API, exactly as the schema names it.
export interface SensorReading {
  id: number;
  sensorType: string;
  dateTime: string; // ISO 8601
  accountName: string;
  DataKey: string;
  DataValue: number;
}

export interface SensorPoint {
  time: number; // epoch ms
  value: number;
}

// One selectable option for a tile: a unique sensorType + DataKey pair.
export interface SensorSeries {
  key: string;
  label: string;
  points: SensorPoint[]; // oldest first
}

@Injectable({ providedIn: 'root' })
export class SensorDataService {
  private readonly http = inject(HttpClient);
  private readonly readings = signal<SensorReading[]>([]);
  readonly error = signal('');

  // Account-filtered readings grouped into one series per sensorType + DataKey.
  readonly series = computed(() => {
    const byKey = new Map<string, SensorSeries>();
    for (const reading of this.readings()) {
      if (reading.accountName !== ACCOUNT_NAME) {
        continue;
      }
      const key = seriesKey(reading.sensorType, reading.DataKey);
      let series = byKey.get(key);
      if (!series) {
        series = { key, label: `${reading.sensorType} – ${reading.DataKey}`, points: [] };
        byKey.set(key, series);
      }
      series.points.push({ time: Date.parse(reading.dateTime), value: reading.DataValue });
    }
    for (const series of byKey.values()) {
      series.points.sort((a, b) => a.time - b.time);
    }
    return byKey;
  });

  // The options offered on the create page.
  readonly options = computed(() =>
    [...this.series().values()]
      .map(({ key, label }) => ({ key, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  );

  constructor() {
    const fetchReadings: () => Observable<SensorReading[]> = USE_MOCK_DATA
      ? ((api) => () => of(api()))(createMockApi())
      : () => this.http.get<SensorReading[]>(API_URL);

    timer(0, POLL_INTERVAL_MS)
      .pipe(
        switchMap(() =>
          fetchReadings().pipe(
            catchError(() => {
              this.error.set('Could not load sensor data. Showing the last values received.');
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((readings) => {
        if (readings) {
          this.error.set('');
          this.readings.set(readings);
        }
      });
  }

  label(key: string): string {
    return this.series().get(key)?.label ?? key;
  }

  latest(key: string): number | null {
    return this.series().get(key)?.points.at(-1)?.value ?? null;
  }
}

export function seriesKey(sensorType: string, dataKey: string): string {
  return `${sensorType}:${dataKey}`;
}
