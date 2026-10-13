import { afterRenderEffect, Component, DestroyRef, ElementRef, inject, input, viewChild } from '@angular/core';
import Chart, { ChartConfiguration } from 'chart.js/auto';
import { isNumeric, SensorDataService, SensorSeries } from '../../sensor-data.service';
import { Theme, ThemeService } from '../../theme.service';
import { TimeRangeService } from '../time-range.service';

// Chart of the chosen sensor series within the dashboard time range. Updates whenever new data arrives.
// If every value is a number: line chart over time. Otherwise: bar chart counting each distinct value.
// Size it by setting a height on the host element.
@Component({
  selector: 'app-sensor-chart',
  template: `<canvas #canvas></canvas>`,
  styles: `
    :host { display: block; position: relative; height: 100%; min-height: 12rem; }
  `,
})
export class SensorChart {
  private readonly sensorData = inject(SensorDataService);
  private readonly timeRange = inject(TimeRangeService);
  private readonly themeService = inject(ThemeService);
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  readonly fields = input.required<string[]>();
  private chart?: Chart;
  private chartTheme?: Theme;

  constructor() {
    afterRenderEffect(() => {
      const { from, to } = this.timeRange.bounds();
      const series = this.fields().map((key) => {
        const s = this.sensorData.series().get(key);
        return {
          key,
          label: this.sensorData.label(key),
          points: (s?.points ?? []).filter((p) => p.time >= from && p.time <= to),
        };
      });
      const allNumeric = series.every((s) => s.points.every((p) => isNumeric(p.value)));
      const config = allNumeric ? lineConfig(series, from, to) : barConfig(series);
      const theme = this.themeService.theme();

      // Same chart type and theme: update in place. Otherwise (or first run): rebuild.
      if (this.chart && this.chartTheme === theme && (this.chart.config as ChartConfiguration).type === config.type) {
        this.chart.data = config.data;
        this.chart.options = config.options ?? {};
        this.chart.update('none');
        return;
      }
      this.chart?.destroy();
      // Chart.js reads these defaults when a chart is created, so they follow the current theme.
      // (Changing them turns off automatic series colors, hence colors.forceOverride in the configs.)
      const styles = getComputedStyle(document.documentElement);
      Chart.defaults.color = styles.getPropertyValue('--text-muted').trim();
      Chart.defaults.borderColor = styles.getPropertyValue('--border').trim();
      this.chart = new Chart(this.canvas().nativeElement, config);
      this.chartTheme = theme;
    });
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
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
  const values = [...new Set(series.flatMap((s) => s.points.map((p) => p.value)))].sort();
  return {
    type: 'bar',
    data: {
      labels: values,
      datasets: series.map((s) => ({
        label: s.label,
        data: values.map((value) => s.points.filter((p) => p.value === value).length),
      })),
    },
    options: {
      animation: false,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      plugins: { colors: { forceOverride: true } },
    },
  };
}

function formatTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
