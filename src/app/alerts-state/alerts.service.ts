import { computed, Injectable, signal } from '@angular/core';
import { AlertInfo, ALERTS } from './alerts.catalog';

export interface QueueEntry {
  id: number;
  info: AlertInfo;
  time: Date;
}

const ONE_DAY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

// The alerts/reminders demo state, shared by the Overview page (which shows and handles events)
// and the Admin Triggers page (which adds them). Lives for the whole app session, so the queue,
// open issues and snooze timers survive switching pages (a full reload starts over).
// The queue logic is the demo's original logic from demos/alert-demo.html.
@Injectable({ providedIn: 'root' })
export class AlertsService {
  readonly alerts = ALERTS;

  // Every triggered event. Each entry remembers which alert it is, when it happened, and a unique id.
  private readonly queue_ = signal<QueueEntry[]>([]);
  readonly queue = this.queue_.asReadonly();

  // Reminders that have been triggered but not fixed yet. Dismissing a reminder hides it from the
  // queue, but it stays here until it's fixed with "Order Replacement" or "Mark as replaced".
  private readonly openIssues_ = signal<AlertInfo[]>([]);
  readonly openIssues = this.openIssues_.asReadonly();

  // The id of the event shown in full on the Overview.
  private readonly selectedId_ = signal<number | null>(null);
  readonly selectedId = this.selectedId_.asReadonly();

  private nextId = 1;

  // The queue in display order: all alerts first (oldest first), then all reminders (oldest first).
  readonly sortedQueue = computed(() => {
    const queue = this.queue_();
    const alertsFirst = queue.filter((e) => e.info.type === 'alert');
    const remindersNext = queue.filter((e) => e.info.type === 'reminder');
    // Earlier time first; if two times match, the one triggered first wins.
    const byOldest = (x: QueueEntry, y: QueueEntry) => x.time.getTime() - y.time.getTime() || x.id - y.id;
    return alertsFirst.sort(byOldest).concat(remindersNext.sort(byOldest));
  });

  readonly selectedEvent = computed(() => this.findEvent(this.selectedId_()));

  findEvent(id: number | null): QueueEntry | undefined {
    return this.queue_().find((e) => e.id === id);
  }

  // Add a new event to the queue. "twoDaysAgo" is a demo helper: true pretends it happened 2 days ago.
  addEvent(alertInfo: AlertInfo, twoDaysAgo = false): void {
    const time = twoDaysAgo ? new Date(Date.now() - 2 * ONE_DAY) : new Date();
    const entry: QueueEntry = { id: this.nextId++, info: alertInfo, time };
    if (alertInfo.type === 'reminder') {
      this.openIssue(alertInfo);
    }
    this.queue_.update((queue) => [...queue, entry]);

    // Decide whether to switch the full view to the top of the queue:
    //  - if nothing is being shown yet, or
    //  - if a new ALERT arrives while a reminder is being shown (alerts come first).
    const shown = this.selectedEvent();
    if (!shown || (alertInfo.type === 'alert' && shown.info.type === 'reminder')) {
      this.selectedId_.set(this.sortedQueue()[0].id);
    }
  }

  // Snooze: put the same event back after a delay, even if you've left the Overview page.
  addEventLater(alertInfo: AlertInfo, ms: number): void {
    setTimeout(() => this.addEvent(alertInfo), ms);
  }

  // Remove an event from the queue (after a button is clicked).
  removeEvent(id: number): void {
    this.queue_.update((queue) => queue.filter((e) => e.id !== id));
    if (this.selectedId_() === id) {
      this.selectTop();
    }
  }

  select(id: number): void {
    this.selectedId_.set(id);
  }

  // A reminder was fixed: stop counting it, and clear any copies from the queue.
  resolveIssue(alertInfo: AlertInfo): void {
    this.openIssues_.update((issues) => issues.filter((i) => i !== alertInfo));
    this.queue_.update((queue) => queue.filter((e) => e.info !== alertInfo));
    if (!this.selectedEvent()) {
      this.selectTop();
    }
  }

  // Clicking an unaddressed reminder on a score card:
  //  - if it's already in the queue, opens it, just like clicking it in the queue
  //  - if it isn't (it was dismissed), puts it back in the queue and opens it
  addressIssue(alertInfo: AlertInfo): void {
    let entry = this.queue_().find((e) => e.info === alertInfo);
    if (!entry) {
      entry = { id: this.nextId++, info: alertInfo, time: new Date() };
      const added = entry;
      this.queue_.update((queue) => [...queue, added]);
    }
    this.selectedId_.set(entry.id);
  }

  // Track a reminder as an open issue (only once, even if triggered again).
  private openIssue(alertInfo: AlertInfo): void {
    if (alertInfo.penalty && !this.openIssues_().includes(alertInfo)) {
      this.openIssues_.update((issues) => [...issues, alertInfo]);
    }
  }

  // Show whatever is now at the top of the queue (or nothing).
  private selectTop(): void {
    this.selectedId_.set(this.sortedQueue()[0]?.id ?? null);
  }
}
