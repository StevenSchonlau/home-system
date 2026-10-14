import { TestBed } from '@angular/core/testing';
import { AlertInfo } from './alerts.catalog';
import { AlertsService } from './alerts.service';

function calendarReminder(calendarId: number, subject: string, time = new Date()): { info: AlertInfo; time: Date } {
  return {
    time,
    info: {
      type: 'reminder',
      calendarId,
      name: subject,
      title: subject,
      message: 'This is a reminder.',
      buttons: [{ label: 'Dismiss', style: 'secondary', action: 'dismiss' }],
    },
  };
}

describe('AlertsService calendar reminders', () => {
  let alerts: AlertsService;
  const names = () => alerts.sortedQueue().map((e) => e.info.name);

  beforeEach(() => {
    alerts = TestBed.inject(AlertsService);
  });

  it('adds reminders due today without touching scores or triggered events', () => {
    const smoke = alerts.alerts.find((a) => a.name === 'Smoke alarm')!;
    alerts.addEvent(smoke);
    alerts.syncCalendarReminders([calendarReminder(3, 'Reminder Filter Change')]);
    expect(names()).toEqual(['Smoke alarm', 'Reminder Filter Change']);
    expect(alerts.openIssues()).toEqual([]);
    alerts.syncCalendarReminders([calendarReminder(3, 'Reminder Filter Change')]);
    expect(names()).toEqual(['Smoke alarm', 'Reminder Filter Change']); // no duplicates
  });

  it('keeps a dismissed reminder hidden for the session', () => {
    alerts.syncCalendarReminders([calendarReminder(3, 'Reminder Filter Change')]);
    alerts.removeEvent(alerts.queue()[0].id);
    alerts.syncCalendarReminders([calendarReminder(3, 'Reminder Filter Change')]);
    expect(names()).toEqual([]);
  });

  it('updates changed reminders and drops ones no longer due', () => {
    alerts.syncCalendarReminders([calendarReminder(3, 'Old subject'), calendarReminder(4, 'Water plants')]);
    alerts.syncCalendarReminders([calendarReminder(3, 'New subject')]);
    expect(names()).toEqual(['New subject']);
    expect(alerts.selectedEvent()?.info.name).toBe('New subject');
  });
});
