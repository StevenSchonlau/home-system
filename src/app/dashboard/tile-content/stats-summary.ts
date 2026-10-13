import { Component, computed, inject, input } from '@angular/core';
import { isNumeric, SensorDataService } from '../../sensor-data.service';
import { TimeRangeService } from '../time-range.service';

interface Stat {
  label: string;
  value: string;
}

// Summary stats for each chosen series over the selected time range.
// Numbers: latest, min, max, average, std dev, count. Text: count, most common value, distinct values.
@Component({
  selector: 'app-stats-summary',
  template: `
    @for (entry of entries(); track entry.key) {
      <section>
        <h3>{{ entry.label }}</h3>
        @if (entry.stats.length) {
          <dl>
            @for (stat of entry.stats; track stat.label) {
              <div>
                <dt>{{ stat.label }}</dt>
                <dd>{{ stat.value }}</dd>
              </div>
            }
          </dl>
        } @else {
          <p class="none">No readings in this time range.</p>
        }
      </section>
    }
  `,
  styles: `
    :host { display: flex; flex-wrap: wrap; gap: 1.5rem; }
    section { flex: 1 1 12rem; min-width: 0; }
    h3 { margin: 0 0 0.5rem; font-size: 1rem; font-weight: 600; }
    dl { display: grid; grid-template-columns: repeat(auto-fill, minmax(5.5rem, 1fr)); gap: 0.5rem 1rem; margin: 0; }
    dt { font-size: 0.75rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; }
    dd { margin: 0.15rem 0 0; font-size: 1.15rem; font-weight: 700; overflow-wrap: anywhere; }
    .none { margin: 0; color: var(--text-muted); font-size: 0.9rem; }
  `,
})
export class StatsSummary {
  private readonly sensorData = inject(SensorDataService);
  private readonly timeRange = inject(TimeRangeService);
  readonly fields = input.required<string[]>();

  protected readonly entries = computed(() => {
    const { from, to } = this.timeRange.bounds();
    return this.fields().map((key) => {
      const values = (this.sensorData.series().get(key)?.points ?? [])
        .filter((p) => p.time >= from && p.time <= to)
        .map((p) => p.value);
      return {
        key,
        label: this.sensorData.label(key),
        stats: values.length === 0 ? [] : values.every(isNumeric) ? numberStats(values.map(Number)) : textStats(values),
      };
    });
  });
}

// values are oldest first.
function numberStats(values: number[]): Stat[] {
  const count = values.length;
  const mean = values.reduce((sum, v) => sum + v, 0) / count;
  const sd = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / count);
  return [
    { label: 'Latest', value: format(values[count - 1]) },
    { label: 'Min', value: format(Math.min(...values)) },
    { label: 'Max', value: format(Math.max(...values)) },
    { label: 'Average', value: format(mean) },
    { label: 'Std dev', value: format(sd) },
    { label: 'Count', value: String(count) },
  ];
}

function textStats(values: string[]): Stat[] {
  const counts = new Map<string, number>();
  for (const value of values) {
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const [mostCommon, times] = [...counts].sort((a, b) => b[1] - a[1])[0];
  return [
    { label: 'Latest', value: values[values.length - 1] },
    { label: 'Most common', value: `${mostCommon} (${times}×)` },
    { label: 'Distinct', value: String(counts.size) },
    { label: 'Count', value: String(values.length) },
  ];
}

function format(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
}
