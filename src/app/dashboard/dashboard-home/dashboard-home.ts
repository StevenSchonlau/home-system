import { CdkDrag, CdkDragDrop, CdkDropList } from '@angular/cdk/drag-drop';
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
    this.addSensorDialog.nativeElement.showModal();
  }

  protected openDeleteSensor(): void {
    this.sensorNotice.set('');
    this.deleteSensorName.set('');
    this.deleteSensorDialog.nativeElement.showModal();
  }

  protected submitAddSensor(event: SubmitEvent): void {
    event.preventDefault();
    this.sensorNotice.set(
      'Sensor creation is not connected to a sensor registry yet. No changes were made.',
    );
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
