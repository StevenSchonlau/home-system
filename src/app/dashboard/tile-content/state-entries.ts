import { Component, computed, inject, input } from '@angular/core';
import { isNumeric, SensorDataService } from '../../sensor-data.service';
import { ColorMode, Threshold } from '../dashboard.models';
import { TimeRangeService } from '../time-range.service';
import { stdDevStatus, thresholdStatus, ValueStatus } from './value-status';

const SPARK_WIDTH = 100;
const SPARK_HEIGHT = 30;

// Shows the latest value of each chosen sensor series. Updates whenever new data arrives.
// Optionally colors numbers (std dev or min/max) and draws a sparkline of the selected time range.
@Component({
  selector: 'app-state-entries',
  template: `
    <dl>
      @for (entry of entries(); track entry.key) {
        <div>
          <dt>{{ entry.label }}</dt>
          <dd [class]="entry.status" [attr.title]="entry.statusText">
            {{ entry.value }}
            @if (entry.status === 'alert' && colorMode() === 'thresholds') {
              <span class="icon" role="img" aria-label="Past limit">⚠</span>
            }
            @if (entry.spark) {
              <svg class="spark" [attr.viewBox]="'0 0 ' + sparkWidth + ' ' + sparkHeight" preserveAspectRatio="none" aria-hidden="true">
                <polyline [attr.points]="entry.spark" />
              </svg>
            }
          </dd>
        </div>
      }
    </dl>
  `,
  styles: `
    dl { display: flex; flex-wrap: wrap; gap: 1.5rem; margin: 0; }
    dd { display: flex; align-items: center; gap: 0.5rem; margin: 0.5rem 0 0; font-size: 1.6rem; font-weight: bold; }
    .ok { color: var(--ok); }
    .warn { color: var(--warn); }
    .alert { color: var(--danger); }
    .icon { font-size: 1.2rem; }
    .spark { width: 5rem; height: 1.6rem; overflow: visible; }
    .spark polyline { fill: none; stroke: var(--accent); stroke-width: 2; vector-effect: non-scaling-stroke; }
  `,
})
export class StateEntries {
  private readonly sensorData = inject(SensorDataService);
  private readonly timeRange = inject(TimeRangeService);
  readonly fields = input.required<string[]>();
  readonly colorMode = input<ColorMode>('none');
  readonly thresholds = input<Record<string, Threshold>>({});
  readonly showTrend = input(false);
  protected readonly sparkWidth = SPARK_WIDTH;
  protected readonly sparkHeight = SPARK_HEIGHT;

  protected readonly entries = computed(() => {
    const { from, to } = this.timeRange.bounds();
    return this.fields().map((key) => {
      const latest = this.sensorData.latest(key);
      // Numeric readings in the selected time range: used for std dev and the sparkline.
      const history = (this.sensorData.series().get(key)?.points ?? [])
        .filter((p) => p.time >= from && p.time <= to && isNumeric(p.value))
        .map((p) => Number(p.value));
      const status = this.status(key, latest, history);
      return {
        key,
        label: this.sensorData.label(key),
        value: format(latest),
        status,
        statusText: STATUS_TEXT[status],
        spark: this.showTrend() ? sparkline(history) : null,
      };
    });
  });

  private status(key: string, latest: string | null, history: number[]): ValueStatus {
    if (latest === null || !isNumeric(latest)) {
      return 'normal';
    }
    switch (this.colorMode()) {
      case 'stdDev':
        return stdDevStatus(Number(latest), history);
      case 'thresholds':
        return thresholdStatus(Number(latest), this.thresholds()[key] ?? {});
      default:
        return 'normal';
    }
  }
}

const STATUS_TEXT: Record<ValueStatus, string | null> = {
  normal: null,
  ok: 'Within limits',
  warn: 'Near a limit / unusual',
  alert: 'Past a limit / very unusual',
};

// Numbers get at most 2 decimals; text is shown as-is.
function format(value: string | null): string {
  if (value === null) {
    return '—';
  }
  return isNumeric(value) ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 }) : value;
}

// SVG polyline points scaled into the sparkline box. Needs at least 2 readings.
function sparkline(values: number[]): string | null {
  if (values.length < 2) {
    return null;
  }
  const min = Math.min(...values);
  const span = Math.max(...values) - min || 1;
  return values
    .map((v, i) => {
      const x = (i / (values.length - 1)) * SPARK_WIDTH;
      const y = SPARK_HEIGHT - ((v - min) / span) * SPARK_HEIGHT;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}
