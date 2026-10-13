import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../app.routes';
import { DashboardConfigService } from '../dashboard/dashboard-config.service';
import { DashboardHome } from '../dashboard/dashboard-home/dashboard-home';
import { SensorDataService } from '../sensor-data.service';
import { CalendarPage } from './calendar-page';
import { CalendarService } from './calendar.service';
import { TimeRangeService } from '../dashboard/time-range.service';

describe('Calendar with the existing dashboard', () => {
  let savedLayout: string | null;
  let savedRange: string | null;
  beforeEach(() => {
    savedLayout = localStorage.getItem('dashboard-config');
    savedRange = localStorage.getItem('dashboard-time-range');
    localStorage.removeItem('dashboard-config');
    localStorage.removeItem('dashboard-time-range');
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        {
          provide: SensorDataService,
          useValue: {
            error: signal(''),
            label: (key: string) => key,
            latest: () => '21',
            series: signal(new Map()),
          },
        },
      ],
    });
    TestBed.inject(DashboardConfigService).set({
      tiles: [{ id: 'temperature', size: '1x1', fields: ['temperature:value'] }],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    for (const [key, value] of [
      ['dashboard-config', savedLayout],
      ['dashboard-time-range', savedRange],
    ]) {
      if (value === null) localStorage.removeItem(key!);
      else localStorage.setItem(key!, value!);
    }
  });

  it('shows shared items and preserves them when the dashboard calendar button is clicked', async () => {
    const now = new Date();
    const service = TestBed.inject(CalendarService);
    service.setItems('tasks', [
      {
        id: 'filter',
        title: 'Replace filter',
        start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).toISOString(),
        kind: 'task',
      },
    ]);
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/dashboard', DashboardHome);
    expect(harness.routeNativeElement?.querySelector('app-calendar-widget')?.textContent).toContain(
      'Replace filter',
    );
    const link = harness.routeNativeElement!.querySelector<HTMLAnchorElement>(
      '.toolbar a[href="/calendar"]',
    )!;
    expect(link.textContent).toContain('Open calendar');
    link.click();
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/calendar');
    expect(harness.routeNativeElement?.querySelector('app-calendar')).not.toBeNull();
    expect(harness.routeNativeElement?.textContent).toContain('Replace filter');
    expect(TestBed.inject(CalendarService)).toBe(service);
    await harness.navigateByUrl('/dashboard', DashboardHome);
    expect(harness.routeNativeElement?.querySelector('app-calendar-widget')?.textContent).toContain(
      'Replace filter',
    );
  });

  it('keeps calendar content outside the sensor tile layout and works with an empty schedule', async () => {
    const config = TestBed.inject(DashboardConfigService);
    const before = JSON.stringify(config.config());
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/dashboard', DashboardHome);
    const root = harness.routeNativeElement!;
    expect(root.querySelectorAll('.grid app-dashboard-tile')).toHaveLength(1);
    expect(root.querySelector('.grid app-calendar-widget')).toBeNull();
    expect(root.querySelector('.tile-link')?.getAttribute('href')).toBe(
      '/dashboard/tile/temperature',
    );
    expect(root.querySelector('app-calendar-widget')?.textContent).toContain('No scheduled items');
    const filters = root.querySelectorAll<HTMLButtonElement>('app-calendar-widget .filters button');
    for (const button of Array.from(filters)) {
      button.click();
      harness.detectChanges();
      expect(button.getAttribute('aria-pressed')).toBe('true');
    }
    const reorder = root.querySelector<HTMLButtonElement>('.actions button')!;
    reorder.click();
    harness.detectChanges();
    expect(root.querySelector('.grid.editing')).not.toBeNull();
    expect(root.querySelector('.toolbar a[href="/calendar"]')).not.toBeNull();
    expect(JSON.stringify(config.config())).toBe(before);
    await harness.navigateByUrl('/calendar', CalendarPage);
    expect(harness.routeNativeElement?.querySelectorAll('.day')).toHaveLength(42);
  });

  it('keeps sensor time-range controls independent from the calendar filters', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/dashboard', DashboardHome);
    const root = harness.routeNativeElement!;
    const range = TestBed.inject(TimeRangeService);
    const amount = root.querySelector<HTMLInputElement>(
      'app-time-range-picker input[type="number"]',
    )!;
    amount.value = '48';
    amount.dispatchEvent(new Event('input'));
    harness.detectChanges();
    expect(range.range().amount).toBe(48);
    const before = { ...range.range() };
    root.querySelector<HTMLButtonElement>('app-calendar-widget .filters button')!.click();
    harness.detectChanges();
    expect(range.range()).toEqual(before);
    const custom = root.querySelectorAll<HTMLButtonElement>('app-time-range-picker button')[1];
    custom.click();
    harness.detectChanges();
    expect(range.range().mode).toBe('custom');
    const fields = root.querySelectorAll<HTMLInputElement>(
      'app-time-range-picker input[type="datetime-local"]',
    );
    fields[0].value = '2026-10-15T12:00';
    fields[0].dispatchEvent(new Event('change'));
    fields[1].value = '2026-10-14T12:00';
    fields[1].dispatchEvent(new Event('change'));
    harness.detectChanges();
    expect(root.querySelector('app-time-range-picker [role="alert"]')?.textContent).toContain(
      'Start is after end',
    );
    expect(
      root
        .querySelector('app-calendar-widget .filters button[aria-pressed="true"]')
        ?.textContent?.trim(),
    ).toBe('day');
    expect(JSON.parse(localStorage.getItem('dashboard-time-range')!).mode).toBe('custom');
  });

  it('imports, persists, reorders, and removes sensor tiles without removing the calendar', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/dashboard', DashboardHome);
    const root = harness.routeNativeElement!;
    const config = TestBed.inject(DashboardConfigService);
    const input = root.querySelector<HTMLInputElement>('input[type="file"]')!;
    const layout = {
      tiles: [
        { id: 'door', size: '1x1', fields: ['door:state'] },
        { id: 'temperature', size: '1x1', fields: ['temperature:value'] },
      ],
    };
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [{ text: async () => JSON.stringify(layout) }],
    });
    input.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(config.config()).toEqual(layout);
    expect(JSON.parse(localStorage.getItem('dashboard-config')!)).toEqual(layout);
    config.moveTile(0, 1);
    harness.detectChanges();
    expect(
      Array.from(root.querySelectorAll('.tile-link')).map((link) => link.getAttribute('href')),
    ).toEqual(['/dashboard/tile/temperature', '/dashboard/tile/door']);
    root.querySelector<HTMLButtonElement>('.actions button')!.click();
    harness.detectChanges();
    root.querySelector<HTMLButtonElement>('.grid .remove')!.click();
    harness.detectChanges();
    expect(config.config().tiles.map((tile) => tile.id)).toEqual(['door']);
    expect(JSON.parse(localStorage.getItem('dashboard-config')!).tiles).toHaveLength(1);
    expect(root.querySelector('app-calendar-widget')).not.toBeNull();
    Object.defineProperty(input, 'files', {
      configurable: true,
      value: [{ text: async () => '{bad json' }],
    });
    input.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();
    harness.detectChanges();
    expect(root.querySelector('.error[role="alert"]')?.textContent).toContain(
      'not a valid dashboard config',
    );
    expect(config.config().tiles.map((tile) => tile.id)).toEqual(['door']);
  });

  it('still renders sensor values and errors beside a working calendar', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/dashboard', DashboardHome);
    const root = harness.routeNativeElement!;
    expect(root.querySelector('app-state-entries dd')?.textContent?.trim()).toBe('21');
    TestBed.inject(SensorDataService).error.set('Sensor backend unavailable');
    harness.detectChanges();
    expect(root.querySelector('.error')?.textContent).toContain('Sensor backend unavailable');
    expect(root.querySelector('.toolbar a[href="/calendar"]')).not.toBeNull();
    expect(root.querySelector('app-calendar-widget .empty')).not.toBeNull();
  });
});
