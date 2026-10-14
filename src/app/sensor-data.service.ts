import { HttpClient } from '@angular/common/http';
import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, Observable, of, switchMap, timer } from 'rxjs';
import { AccountService } from './account.service';
import { createMockApi } from './sensor-data.mock';

// TODO: replace with the real endpoint, then set USE_MOCK_DATA to false.
export const API_URL = '/Pioneer';
export const USE_MOCK_DATA = false;
// The account to show is picked in the dashboard (AccountService); its default is DEFAULT_ACCOUNT_NAME there.
const POLL_INTERVAL_MS = 3_000;

// One row from the API, exactly as the schema names it.
export interface SensorReading {
  id: number;
  sensorType: string;
  dateTime: string; // ISO 8601
  accountName: string;
  dataKey: string;
  dataValue: string; // numeric, but the API returns it as a string
}

export interface SensorPoint {
  time: number; // epoch ms
  value: string;
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
  private readonly accounts = inject(AccountService);
  private readonly readings = signal<SensorReading[]>([]);
  readonly error = signal('');

  // Sensor names available for the selected account, based on received readings.
  readonly sensorTypes = computed(() => {
    const account = this.accounts.selected();
    return [
      ...new Set(
        this.readings()
          .filter((reading) => reading.accountName === account)
          .map((reading) => reading.sensorType),
      ),
    ].sort((a, b) => a.localeCompare(b));
  });

  // Readings for the selected account (exact, case-sensitive match), grouped into one series per sensorType + DataKey.
  readonly series = computed(() => {
    const byKey = new Map<string, SensorSeries>();
    const account = this.accounts.selected();
    for (const reading of this.readings()) {
      if (reading.accountName !== account) {
        continue;
      }
      const key = seriesKey(reading.sensorType, reading.dataKey);
      let series = byKey.get(key);
      if (!series) {
        series = { key, label: `${reading.sensorType} – ${reading.dataKey}`, points: [] };
        byKey.set(key, series);
      }
      series.points.push({ time: parseApiTime(reading.dateTime), value: reading.dataValue });
    }
    for (const series of byKey.values()) {
      series.points.sort((a, b) => a.time - b.time);
    }
    console.log('SensorDataService.series', byKey);
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
      ? (
          (api) => () =>
            of(api())
        )(createMockApi())
      : () => {
          console.log('SensorDataService.fetchReadings', API_URL);
          return this.http.get<SensorReading[]>(API_URL);
        };

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
          this.accounts.available.set([...new Set(readings.map((r) => r.accountName))].sort());
        }
      });
  }

  label(key: string): string {
    return this.series().get(key)?.label ?? key;
  }

  latest(key: string): string | null {
    return this.series().get(key)?.points.at(-1)?.value ?? null;
  }
}

// The API sends UTC times without a "Z" (e.g. "2026-10-13T14:47:37.587"), which browsers would
// read as local time. Treat any time without an explicit offset as UTC.
function parseApiTime(dateTime: string): number {
  const hasOffset = /(Z|[+-]\d{2}:?\d{2})$/i.test(dateTime);
  return Date.parse(hasOffset ? dateTime : `${dateTime}Z`);
}

// True for values like "21.5" or "-3"; false for "open", "", etc.
export function isNumeric(value: string): boolean {
  return value.trim() !== '' && Number.isFinite(Number(value));
}

export function seriesKey(sensorType: string, dataKey: string): string {
  return `${sensorType}:${dataKey}`;
}
