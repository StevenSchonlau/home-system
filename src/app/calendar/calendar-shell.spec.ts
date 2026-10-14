import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { App } from '../app';
import { routes } from '../app.routes';
import { SensorDataService } from '../sensor-data.service';
import { CalendarService } from './calendar.service';

describe('Calendar in the application shell', () => {
  let savedTheme: string | null;
  let originalTheme: string | undefined;
  let savedLayout: string | null;
  let savedRange: string | null;

  beforeEach(() => {
    savedTheme = localStorage.getItem('theme');
    originalTheme = document.documentElement.dataset['theme'];
    savedLayout = localStorage.getItem('dashboard-config');
    savedRange = localStorage.getItem('dashboard-time-range');
    localStorage.setItem('theme', 'light');
    localStorage.removeItem('dashboard-config');
    localStorage.removeItem('dashboard-time-range');
    TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        {
          provide: SensorDataService,
          useValue: {
            error: signal(''),
            series: signal(new Map()),
            sensorTypes: signal([]),
            label: (key: string) => key,
            latest: () => null,
          },
        },
      ],
    });
  });

  afterEach(() => {
    TestBed.resetTestingModule();
    for (const [key, value] of [
      ['theme', savedTheme],
      ['dashboard-config', savedLayout],
      ['dashboard-time-range', savedRange],
    ]) {
      if (value === null) localStorage.removeItem(key!);
      else localStorage.setItem(key!, value!);
    }
    if (originalTheme === undefined) delete document.documentElement.dataset['theme'];
    else document.documentElement.dataset['theme'] = originalTheme;
  });

  it('navigates from the global dashboard link to the calendar and back with active navigation', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const dashboardLinks = root.querySelectorAll<HTMLAnchorElement>('nav a[href="/dashboard"]');
    expect(dashboardLinks).toHaveLength(1);
    expect(root.querySelector('nav a[href="/overview"]')).not.toBeNull();
    expect(root.querySelector('nav a[href="/calendar"]')).not.toBeNull();
    expect(root.querySelector('nav a[href="/admin-triggers"]')).not.toBeNull();
    dashboardLinks[0].click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/dashboard');
    expect(dashboardLinks[0].getAttribute('aria-current')).toBe('page');
    root.querySelector<HTMLAnchorElement>('app-calendar-widget a[href="/calendar"]')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(TestBed.inject(Router).url).toBe('/calendar');
    expect(root.querySelectorAll('app-calendar .day')).toHaveLength(42);
    expect(dashboardLinks[0].getAttribute('aria-current')).toBeNull();
    expect(root.querySelector('nav a[href="/calendar"]')!.getAttribute('aria-current')).toBe('page');
    dashboardLinks[0].click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(root.querySelector('app-calendar-widget')).not.toBeNull();
  });

  it('toggles and saves the theme without losing calendar data or navigation', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await TestBed.inject(Router).navigateByUrl('/calendar');
    await fixture.whenStable();
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const now = new Date();
    TestBed.inject(CalendarService).setItems('reminders', [
      { id: 'one', title: 'Theme-safe reminder', start: now.toISOString(), kind: 'reminder' },
    ]);
    fixture.detectChanges();
    const toggle = root.querySelector<HTMLButtonElement>('.theme-toggle')!;
    toggle.click();
    fixture.detectChanges();
    expect(document.documentElement.dataset['theme']).toBe('dark');
    expect(localStorage.getItem('theme')).toBe('dark');
    expect(toggle.getAttribute('aria-label')).toBe('Switch to light mode');
    expect(root.querySelector('app-calendar')?.textContent).toContain('Theme-safe reminder');
    toggle.click();
    fixture.detectChanges();
    expect(document.documentElement.dataset['theme']).toBe('light');
    expect(localStorage.getItem('theme')).toBe('light');
    expect(root.querySelector('app-calendar')?.textContent).toContain('Theme-safe reminder');
  });
});
