import { CurrencyPipe, LowerCasePipe } from '@angular/common';
import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ALERT_EMAIL_TO, AlertEmailService } from '../alerts-state/alert-email.service';
import { AlertInfo } from '../alerts-state/alerts.catalog';
import { AlertsService } from '../alerts-state/alerts.service';

interface TriggerList {
  title: string;
  type: AlertInfo['type'];
  groups: { label: string | null; items: AlertInfo[] }[];
}

// Pretend that alerts/reminders just happened (the trigger lists from demos/alert-demo.html).
// Triggered events go into the shared queue shown on the Overview page.
@Component({
  selector: 'app-admin-triggers',
  imports: [RouterLink, CurrencyPipe, LowerCasePipe],
  templateUrl: './admin-triggers.html',
  styleUrl: './admin-triggers.css',
})
export class AdminTriggers {
  protected readonly alerts = inject(AlertsService);
  private readonly email = inject(AlertEmailService);
  protected readonly emailTo = ALERT_EMAIL_TO;
  private readonly destroyRef = inject(DestroyRef);
  // Result of the last alert email ("Emailed … about Smoke alarm" or an error), shown under the intro.
  protected readonly emailStatus = signal<{ text: string; failed: boolean } | null>(null);

  // Reminders (Home, Car) | Alerts, like the original page.
  protected readonly lists: TriggerList[] = [
    {
      title: 'Reminders',
      type: 'reminder',
      groups: [
        { label: 'Home', items: this.alerts.alerts.filter((a) => a.type === 'reminder' && a.asset === 'home') },
        { label: 'Car', items: this.alerts.alerts.filter((a) => a.type === 'reminder' && a.asset === 'car') },
      ],
    },
    {
      title: 'Alerts',
      type: 'alert',
      groups: [{ label: null, items: this.alerts.alerts.filter((a) => a.type === 'alert') }],
    },
  ];

  // The "Saving with Progressive Pulse" reset buttons, one per score card.
  protected readonly savingsAssets = [
    { key: 'home', label: 'Home' },
    { key: 'car', label: 'Car' },
  ] as const;

  // Add the event to the queue. Alerts (not reminders) also send an HTML email to ALERT_EMAIL_TO.
  protected trigger(info: AlertInfo, twoDaysAgo = false): void {
    this.alerts.addEvent(info, twoDaysAgo);
    if (info.type !== 'alert') {
      return;
    }
    const time = twoDaysAgo ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000) : new Date();
    this.emailStatus.set({ text: `Emailing ${ALERT_EMAIL_TO} about ${info.name}…`, failed: false });
    this.email
      .sendAlert(info, time)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.emailStatus.set({ text: `Emailed ${ALERT_EMAIL_TO} about ${info.name}.`, failed: false }),
        error: () =>
          this.emailStatus.set({ text: `Couldn't send the email about ${info.name}. The alert is still in the queue.`, failed: true }),
      });
  }

  // Demo helper: ticking "2 days ago" adds the event as if it happened 2 days ago,
  // then clears the tick so it's ready to use again.
  protected backdate(info: AlertInfo, box: HTMLInputElement): void {
    if (box.checked) {
      this.trigger(info, true);
      setTimeout(() => (box.checked = false), 400); // brief tick, then clear
    }
  }
}
