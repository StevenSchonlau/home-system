import { Component, computed, inject } from '@angular/core';
import { AccountService } from '../account.service';

// Dropdown of every accountName in the sensor data; switches what the whole dashboard shows.
// Renders a toolbar section (the host is display: contents); put it inside a .toolbar-group.
@Component({
  selector: 'app-account-picker',
  template: `
    <div class="toolbar-section">
      <select aria-label="Account" (change)="accounts.select($any($event.target).value)">
        @for (account of options(); track account) {
          <option [value]="account" [selected]="account === accounts.selected()">{{ account }}</option>
        }
      </select>
    </div>
  `,
  styles: `
    :host { display: contents; }
    select { font-weight: 600; }
  `,
})
export class AccountPicker {
  protected readonly accounts = inject(AccountService);

  // Keep the current choice listed even before data arrives or if it has no readings.
  protected readonly options = computed(() => {
    const available = this.accounts.available();
    const selected = this.accounts.selected();
    return available.includes(selected) ? available : [selected, ...available];
  });
}
