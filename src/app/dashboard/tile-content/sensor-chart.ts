import {
  afterRenderEffect,
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  viewChildren,
} from '@angular/core';
import Chart, { ChartConfiguration } from 'chart.js/auto';
import { isNumeric, SensorDataService, SensorSeries } from '../../sensor-data.service';
import { Theme, ThemeService } from '../../theme.service';
import { ChartKind } from '../dashboard.models';
import { TimeRangeService } from '../time-range.service';

// Chart.js's default series colors, used explicitly for pie slices so every pie/ring matches.
const PALETTE = [
  'rgb(54, 162, 235)',
  'rgb(255, 99, 132)',
  'rgb(255, 159, 64)',
  'rgb(255, 205, 86)',
  'rgb(75, 192, 192)',
  'rgb(153, 102, 255)',
  'rgb(201, 203, 207)',
];

// Chart of the chosen sensor series within the dashboard time range. Updates whenever new data arrives.
//   line: values over time. If any value isn't a number, falls back to bar.
//   bar:  how often each distinct value appears, a bar group per series.
//   pie:  the same counts as pies: one per series, or one doughnut with a ring per series when compact.
// Size it by setting a height on the host element.
@Component({
  selector: 'app-sensor-chart',
  template: `
    @for (config of configs(); track $index) {
      <div class="slot"><canvas #canvas></canvas></div>
    }
  `,
  styles: `
    :host { display: flex; gap: 1rem; height: 100%; min-height: 12rem; }
    .slot { position: relative; flex: 1 1 0; min-width: 0; }
  `,
})
export class SensorChart {
  private readonly sensorData = inject(SensorDataService);
  private readonly timeRange = inject(TimeRangeService);
  private readonly themeService = inject(ThemeService);
  private readonly canvases = viewChildren<ElementRef<HTMLCanvasElement>>('canvas');
  readonly fields = input.required<string[]>();
  readonly kind = input<ChartKind>('line');
  // Small tile: draw multiple pie series as nested rings instead of side-by-side pies.
  readonly compact = input(false);
  private charts: Chart[] = [];
  private chartTheme?: Theme;

  protected readonly configs = computed((): ChartConfiguration[] => {
    this.themeService.theme(); // recompute on theme change: pie borders use the surface color
    const { from, to } = this.timeRange.bounds();
    const series = this.fields().map((key) => ({
      key,
      label: this.sensorData.label(key),
      points: (this.sensorData.series().get(key)?.points ?? []).filter((p) => p.time >= from && p.time <= to),
    }));

    const kind = this.kind();
    if (kind === 'line' && series.every((s) => s.points.every((p) => isNumeric(p.value)))) {
      return [lineConfig(series, from, to)];
    }
    if (kind !== 'pie') {
      return [barConfig(series)];
    }
    const border = cssVar('--surface');
    return this.compact() ? [pieConfig(series, border, true)] : series.map((s) => pieConfig([s], border, false));
  });

  constructor() {
    afterRenderEffect(() => {
      const configs = this.configs();
      const canvases = this.canvases();
      const theme = this.themeService.theme();

      // Same charts, types and theme: update in place. Otherwise (or first run): rebuild them all.
      const sameShape =
        this.chartTheme === theme &&
        this.charts.length === configs.length &&
        this.charts.every((chart, i) => (chart.config as ChartConfiguration).type === configs[i].type);
      if (sameShape) {
        this.charts.forEach((chart, i) => {
          chart.data = configs[i].data;
          chart.options = configs[i].options ?? {};
          chart.update('none');
        });
        return;
      }
      this.destroyCharts();
      // Chart.js reads these defaults when a chart is created, so they follow the current theme.
      // (Changing them turns off automatic series colors, hence colors.forceOverride in the configs.)
      Chart.defaults.color = cssVar('--text-muted');
      Chart.defaults.borderColor = cssVar('--border');
      this.charts = configs.map((config, i) => new Chart(canvases[i].nativeElement, config));
      this.chartTheme = theme;
    });
    inject(DestroyRef).onDestroy(() => this.destroyCharts());
  }

  private destroyCharts(): void {
    this.charts.forEach((chart) => chart.destroy());
    this.charts = [];
  }
}

function lineConfig(series: SensorSeries[], from: number, to: number): ChartConfiguration {
  return {
    type: 'line',
    data: {
      datasets: series.map((s) => ({
        label: s.label,
        data: s.points.map((p) => ({ x: p.time, y: Number(p.value) })),
        pointRadius: 0,
      })),
    },
    options: {
      animation: false,
      maintainAspectRatio: false,
      interaction: { mode: 'nearest', axis: 'x', intersect: false },
      scales: {
        x: {
          type: 'linear',
          // Show the whole selected window; open-ended custom ranges fit the data instead.
          min: Number.isFinite(from) ? from : undefined,
          max: Number.isFinite(to) ? to : undefined,
          ticks: { callback: (value) => formatTime(Number(value)) },
        },
      },
      plugins: {
        colors: { forceOverride: true },
        tooltip: { callbacks: { title: (items) => formatTime(items[0].parsed.x ?? 0) } },
      },
    },
  };
}

function barConfig(series: SensorSeries[]): ChartConfiguration {
  const values = distinctValues(series);
  return {
    type: 'bar',
    data: {
      labels: values,
      datasets: series.map((s) => ({ label: s.label, data: countEach(s, values) })),
    },
    options: {
      animation: false,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      plugins: { colors: { forceOverride: true } },
    },
  };
}

// nested: one doughnut, a ring per series. Otherwise a single pie titled with its one series.
function pieConfig(series: SensorSeries[], borderColor: string, nested: boolean): ChartConfiguration {
  const values = distinctValues(series);
  return {
    type: nested ? 'doughnut' : 'pie',
    data: {
      labels: values,
      datasets: series.map((s) => ({
        label: s.label,
        data: countEach(s, values),
        backgroundColor: values.map((_, i) => PALETTE[i % PALETTE.length]),
        borderColor,
      })),
    },
    options: {
      animation: false,
      maintainAspectRatio: false,
      plugins: {
        colors: { enabled: false },
        // Nested rings only appear on small 1x1 tiles, so their key is smaller.
        legend: {
          position: 'bottom',
          labels: nested ? { boxWidth: 10, padding: 6, font: { size: 10 } } : {},
        },
        // Nested rings list every series, one per line (outer ring first); a single pie names its series.
        title: {
          display: true,
          text: series.map((s) => s.label),
          font: { size: 14, weight: 'bold' },
        },
        tooltip: {
          callbacks: { label: (item) => `${item.dataset.label}: ${item.label} — ${item.formattedValue}` },
        },
      },
    },
  };
}

function distinctValues(series: SensorSeries[]): string[] {
  return [...new Set(series.flatMap((s) => s.points.map((p) => p.value)))].sort();
}

function countEach(series: SensorSeries, values: string[]): number[] {
  return values.map((value) => series.points.filter((p) => p.value === value).length);
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function formatTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
