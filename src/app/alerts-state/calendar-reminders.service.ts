import { HttpClient } from '@angular/common/http';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, EMPTY, switchMap, timer } from 'rxjs';
import { parseApiTime } from '../sensor-data.service';
import { AlertInfo } from './alerts.catalog';
import { AlertsService } from './alerts.service';

// One item from the /Calendar endpoint (times are UTC without a "Z", like the sensor API).
interface CalendarItem {
  id: number;
  startDate: string;
  endDate: string;
  targetDate: string;
  subject: string | null;
  body: string | null;
}

const CALENDAR_URL = '/Calendar'; // proxied to the API server (src/proxy.conf.json, nginx.conf)
const POLL_INTERVAL_MS = 5 * 60 * 1000;

// Puts calendar items whose target date is today (local time) into the Overview queue as reminders.
// Checked at startup and every 5 minutes, so new items appear, and items drop off once they're no
// longer due today. Dismissing one hides it until the page is reloaded. They don't affect the
// insurance scores and aren't on the Admin Triggers page. Started from app.config.ts.
@Injectable({ providedIn: 'root' })
export class CalendarRemindersService {
  private readonly http = inject(HttpClient);
  private readonly alerts = inject(AlertsService);

  constructor() {
    timer(0, POLL_INTERVAL_MS)
      .pipe(
        switchMap(() =>
          this.http.get<CalendarItem[]>(CALENDAR_URL).pipe(
            // Keep the reminders we have if a fetch fails; try again next time.
            catchError((error) => {
              console.warn('Could not load calendar reminders', error);
              return EMPTY;
            }),
          ),
        ),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((items) => this.alerts.syncCalendarReminders(items.filter(isDueToday).map(toReminder)));
  }
}

function isDueToday(item: CalendarItem): boolean {
  return new Date(parseApiTime(item.targetDate)).toDateString() === new Date().toDateString();
}

function toReminder(item: CalendarItem): { info: AlertInfo; time: Date } {
  const due = new Date(parseApiTime(item.targetDate));
  const dueText = due.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const body = (item.body ?? '').trim();
  const subject = item.subject?.trim() || 'Calendar reminder';
  return {
    time: due,
    info: {
      type: 'reminder',
      calendarId: item.id,
      name: subject,
      title: subject,
      message: `${body}${/[.!?]$/.test(body) || !body ? '' : '.'} Due today at ${dueText}.`.trim(),
      buttons: [{ label: 'Dismiss', style: 'secondary', action: 'dismiss' }],
    },
  };
}
