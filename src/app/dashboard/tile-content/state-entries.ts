import { Component, computed, inject, input } from '@angular/core';
import { isNumeric, SensorDataService } from '../../sensor-data.service';

// Shows the latest value of each chosen sensor series. Updates whenever new data arrives.
@Component({
  selector: 'app-state-entries',
  template: `
    <dl>
      @for (entry of entries(); track entry.key) {
        <div>
          <dt>{{ entry.label }}</dt>
          <dd>{{ entry.value }}</dd>
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
      value: format(this.sensorData.latest(key)),
    })),
  );
}

// Numbers get at most 2 decimals; text is shown as-is.
function format(value: string | null): string {
  if (value === null) {
    return '—';
  }
  return isNumeric(value) ? Number(value).toLocaleString(undefined, { maximumFractionDigits: 2 }) : value;
}
