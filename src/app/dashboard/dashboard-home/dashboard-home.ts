import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AccountService } from '../../account.service';
import { CalendarWidget } from '../../calendar/calendar-widget';
import { SensorDataService } from '../../sensor-data.service';
import { DashboardConfigService } from '../dashboard-config.service';
import { DashboardConfig, tileDisplay } from '../dashboard.models';
import { DashboardTile } from '../dashboard-tile/dashboard-tile';
import { SensorChart } from '../tile-content/sensor-chart';
import { StateEntries } from '../tile-content/state-entries';
import { StatsSummary } from '../tile-content/stats-summary';
import { TimeRangePicker } from '../time-range-picker/time-range-picker';
import { AccountPicker } from '../account-picker';

@Component({
  imports: [
    CdkDropList,
    CdkDrag,
    RouterLink,
    DashboardTile,
    StateEntries,
    StatsSummary,
    SensorChart,
    TimeRangePicker,
    CalendarWidget,
    AccountPicker,
  ],
  selector: 'app-dashboard-home',
  styleUrl: './dashboard-home.css',
  templateUrl: './dashboard-home.html',
})
export class DashboardHome {
  protected readonly configService = inject(DashboardConfigService);
  protected readonly sensorData = inject(SensorDataService);
  private readonly accounts = inject(AccountService);
  protected readonly editing = signal(false);
  protected readonly importError = signal('');
  protected readonly display = tileDisplay;

  protected drop(event: CdkDragDrop<unknown>): void {
    this.configService.moveTile(event.previousIndex, event.currentIndex);
  }

  protected exportConfig(): void {
    const json = JSON.stringify(this.configService.config(), null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `dashboard-${this.accounts.selected()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  protected async importConfig(event: Event): Promise<void> {
    const fileInput = event.target as HTMLInputElement;
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) {
      return;
    }

    this.importError.set('');
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed?.tiles)) {
        throw new Error();
      }
      this.configService.set(parsed as DashboardConfig);
    } catch {
      this.importError.set('That file is not a valid dashboard config (expected { "tiles": [...] }).');
    }
  }
}
