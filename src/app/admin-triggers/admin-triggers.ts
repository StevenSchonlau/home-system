import { CurrencyPipe, LowerCasePipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
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

  // Demo helper: ticking "2 days ago" adds the event as if it happened 2 days ago,
  // then clears the tick so it's ready to use again.
  protected backdate(info: AlertInfo, box: HTMLInputElement): void {
    if (box.checked) {
      this.alerts.addEvent(info, true);
      setTimeout(() => (box.checked = false), 400); // brief tick, then clear
    }
  }
}
