import { Component, computed, inject } from '@angular/core';
import { TIME_UNITS, TimeRangeService, TimeUnit } from '../time-range.service';

// Controls for the shared dashboard time range: "Last N units" or a custom start/end.
@Component({
  selector: 'app-time-range-picker',
  styleUrl: './time-range-picker.css',
  templateUrl: './time-range-picker.html',
})
export class TimeRangePicker {
  private readonly timeRange = inject(TimeRangeService);
  protected readonly range = this.timeRange.range;
  protected readonly units = TIME_UNITS;

  protected readonly startAfterEnd = computed(() => {
    const { mode, start, end } = this.range();
    return mode === 'custom' && !!start && !!end && start > end;
  });

  protected setMode(mode: 'last' | 'custom'): void {
    this.timeRange.update({ mode });
  }

  protected setAmount(value: string): void {
    const amount = Math.floor(Number(value));
    // Ignore empty/invalid input while typing; the field keeps showing what was typed.
    if (amount >= 1) {
      this.timeRange.update({ amount });
    }
  }

  protected setUnit(unit: string): void {
    this.timeRange.update({ unit: unit as TimeUnit });
  }

  protected setStart(start: string): void {
    this.timeRange.update({ start });
  }

  protected setEnd(end: string): void {
    this.timeRange.update({ end });
  }
}
