import { afterRenderEffect, Component, DestroyRef, ElementRef, inject, input, viewChild } from '@angular/core';
import Chart from 'chart.js/auto';
import { SensorDataService } from '../../sensor-data.service';

// Line chart of the chosen sensor series over time. Updates whenever new data arrives.
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
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  readonly fields = input.required<string[]>();
  private chart?: Chart<'line', { x: number; y: number }[]>;

  constructor() {
    afterRenderEffect(() => {
      const datasets = this.fields().map((key) => ({
        label: this.sensorData.label(key),
        data: (this.sensorData.series().get(key)?.points ?? []).map((p) => ({ x: p.time, y: p.value })),
        pointRadius: 0,
      }));

      if (this.chart) {
        this.chart.data.datasets = datasets;
        this.chart.update('none');
        return;
      }
      this.chart = new Chart(this.canvas().nativeElement, {
        type: 'line',
        data: { datasets },
        options: {
          animation: false,
          maintainAspectRatio: false,
          interaction: { mode: 'nearest', axis: 'x', intersect: false },
          scales: {
            x: {
              type: 'linear',
              ticks: { callback: (value) => formatTime(Number(value)) },
            },
          },
          plugins: {
            tooltip: { callbacks: { title: (items) => formatTime(items[0].parsed.x ?? 0) } },
          },
        },
      });
    });
    inject(DestroyRef).onDestroy(() => this.chart?.destroy());
  }
}

function formatTime(epochMs: number): string {
  return new Date(epochMs).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
