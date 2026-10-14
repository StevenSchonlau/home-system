import { TestBed } from '@angular/core/testing';
import { AlertInfo, SCORES } from './alerts.catalog';
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

describe('AlertsService savings', () => {
  let alerts: AlertsService;

  beforeEach(() => {
    alerts = TestBed.inject(AlertsService);
  });

  const base = { home: SCORES.home.baseline * 0.02, car: SCORES.car.baseline * 0.02 };

  it('starts each card at the base saving of 2% of its baseline policy cost', () => {
    expect(alerts.savings()).toEqual({ home: 24, car: 36 });
  });

  it('adds what a resolved reminder cost to its card\'s running tally, once', () => {
    const extinguisher = alerts.alerts.find((a) => a.name === 'Replace Fire Extinguisher')!;
    alerts.addEvent(extinguisher);
    expect(alerts.savings()).toEqual(base);
    alerts.resolveIssue(extinguisher);
    const saved = extinguisher.penalty! * SCORES.home.costPerPoint;
    expect(alerts.savings()).toEqual({ home: base.home + saved, car: base.car });
    alerts.resolveIssue(extinguisher); // already resolved: no double count
    expect(alerts.savings().home).toBe(base.home + saved);
    alerts.addEvent(extinguisher);
    alerts.resolveIssue(extinguisher); // triggered and fixed again: the tally keeps running
    expect(alerts.savings().home).toBe(base.home + 2 * saved);
  });

  it('resets one card\'s tally back to the base saving', () => {
    const extinguisher = alerts.alerts.find((a) => a.name === 'Replace Fire Extinguisher')!;
    const oil = alerts.alerts.find((a) => a.name === 'Change Oil')!;
    alerts.addEvent(extinguisher);
    alerts.addEvent(oil);
    alerts.resolveIssue(extinguisher);
    alerts.resolveIssue(oil);
    alerts.resetSavings('home');
    expect(alerts.savings()).toEqual({ home: base.home, car: base.car + oil.penalty! * SCORES.car.costPerPoint });
    alerts.resetSavings('car');
    expect(alerts.savings()).toEqual(base);
  });
});
