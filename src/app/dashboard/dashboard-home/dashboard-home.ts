import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  signal,
  ViewChild,
} from '@angular/core';
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
import { AiSummary } from '../tile-content/ai-summary';
import { AskAi } from '../../ai/ask-ai/ask-ai';
import { injectDashboardQuestion } from '../dashboard-question';
import { TimeRangePicker } from '../time-range-picker/time-range-picker';
import { AccountPicker } from '../account-picker';
import { AirQualityWidget } from '../widgets/air-quality-widget';
import { WeatherWidget } from '../widgets/weather-widget';

@Component({
  imports: [
    CdkDropList,
    CdkDrag,
    RouterLink,
    DashboardTile,
    StateEntries,
    StatsSummary,
    AiSummary,
    AskAi,
    SensorChart,
    TimeRangePicker,
    CalendarWidget,
    AccountPicker,
    WeatherWidget,
    AirQualityWidget,
  ],
  selector: 'app-dashboard-home',
  styleUrl: './dashboard-home.css',
  templateUrl: './dashboard-home.html',
})
export class DashboardHome {
  @ViewChild('addSensorDialog') private addSensorDialog!: ElementRef<HTMLDialogElement>;
  @ViewChild('deleteSensorDialog') private deleteSensorDialog!: ElementRef<HTMLDialogElement>;

  protected readonly configService = inject(DashboardConfigService);
  protected readonly sensorData = inject(SensorDataService);
  private readonly accounts = inject(AccountService);
  protected readonly editing = signal(false);
  protected readonly importError = signal('');
  protected readonly sensorNotice = signal('');
  protected readonly deleteSensorName = signal('');
  protected readonly sensorDateTime = signal('');
  protected readonly sensorAccountName = signal(this.accounts.selected());
  protected readonly isAddingSensor = signal(false);
  protected readonly sensorAdded = signal(false);
  protected readonly display = tileDisplay;
  protected readonly prepareQuestion = injectDashboardQuestion();

  // "Good morning, Steven". Rechecked every minute so it changes over while the page is open.
  private readonly now = signal(new Date());
  protected readonly greeting = computed(
    () => `${partOfDay(this.now())}, ${this.accounts.selected()}`,
  );

  constructor() {
    const timer = setInterval(() => this.now.set(new Date()), 60_000);
    inject(DestroyRef).onDestroy(() => clearInterval(timer));
  }

  protected drop(event: CdkDragDrop<unknown>): void {
    this.configService.moveTile(event.previousIndex, event.currentIndex);
  }

  protected openAddSensor(): void {
    this.sensorNotice.set('');
    this.sensorDateTime.set(new Date().toISOString());
    this.sensorAccountName.set(this.accounts.selected());
    this.isAddingSensor.set(false);
    this.sensorAdded.set(false);
    this.addSensorDialog.nativeElement.showModal();
  }

  protected openDeleteSensor(): void {
    this.sensorNotice.set('');
    this.deleteSensorName.set('');
    this.deleteSensorDialog.nativeElement.showModal();
  }

  protected submitAddSensor(event: SubmitEvent): void {
    event.preventDefault();
    if (this.isAddingSensor() || this.sensorAdded()) {
      return;
    }
    if (!(event.currentTarget instanceof HTMLFormElement)) {
      throw new Error('Add sensor form is unavailable.');
    }

    const formData = new FormData(event.currentTarget);
    const field = (name: string) => String(formData.get(name) ?? '').trim();
    const sensorType = field('sensorType');
    const accountName = field('accountName');
    const dataKey = field('dataKey');
    const dataValue = field('dataValue');
    if (!sensorType || !accountName || !dataKey || !dataValue) {
      this.sensorNotice.set('Complete all required fields before adding the sensor.');
      return;
    }

    this.isAddingSensor.set(true);
    this.sensorData
      .addReading({
        sensorType,
        dateTime: this.sensorDateTime(),
        accountName,
        dataKey,
        dataValue,
      })
      .subscribe({
        next: () => {
          this.isAddingSensor.set(false);
          this.sensorAdded.set(true);
          this.sensorNotice.set('Sensor reading added successfully.');
        },
        error: (error: HttpErrorResponse) => {
          this.isAddingSensor.set(false);
          this.sensorNotice.set(
            error.status === 0
              ? 'Could not add sensor. Check the network connection and API access, then try again.'
              : `Could not add sensor (HTTP ${error.status} ${error.statusText}). Please try again.`,
          );
        },
      });
  }

  protected confirmDeleteSensor(event: SubmitEvent): void {
    event.preventDefault();
    this.sensorNotice.set(
      'Sensor deletion is not connected to a sensor registry yet. No changes were made.',
    );
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
      this.importError.set(
        'That file is not a valid dashboard config (expected { "tiles": [...] }).',
      );
    }
  }
}

// Morning 5:00–11:59, afternoon 12:00–16:59, evening otherwise.
function partOfDay(date: Date): string {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) {
    return 'Good morning';
  }
  return hour >= 12 && hour < 17 ? 'Good afternoon' : 'Good evening';
}
