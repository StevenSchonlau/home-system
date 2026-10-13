import { DecimalPipe } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { SensorDataService } from '../../sensor-data.service';

// Shows the latest value of each chosen sensor series. Updates whenever new data arrives.
@Component({
  imports: [DecimalPipe],
  selector: 'app-state-entries',
  template: `
    <dl>
      @for (entry of entries(); track entry.key) {
        <div>
          <dt>{{ entry.label }}</dt>
          <dd>{{ entry.value === null ? '—' : (entry.value | number: '1.0-2') }}</dd>
        </div>
      }
    </dl>
  `,
  styles: `
    dl { display: flex; flex-wrap: wrap; gap: 1.5rem; margin: 0; }
    dd { margin: 0.5rem 0 0; font-size: 1.6rem; font-weight: bold; }
  `,
})
export class StateEntries {
  private readonly sensorData = inject(SensorDataService);
  readonly fields = input.required<string[]>();

  protected readonly entries = computed(() =>
    this.fields().map((key) => ({
      key,
      label: this.sensorData.label(key),
      value: this.sensorData.latest(key),
    })),
  );
}
