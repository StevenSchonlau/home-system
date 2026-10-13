import { Component, input, output } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Calendar } from './calendar';
import { CalendarItem } from './calendar.models';

@Component({
  selector: 'app-calendar-widget',
  imports: [Calendar, RouterLink],
  template:
    '<app-calendar [compact]="true" [items]="items()" (itemSelected)="itemSelected.emit($event)" /><a routerLink="/calendar">View full calendar →</a>',
  styles:
    ':host{display:block}a{display:inline-block;margin-top:12px;color:var(--accent, #155e75);font:13px system-ui,sans-serif}',
})
export class CalendarWidget {
  readonly items = input<readonly CalendarItem[] | undefined>();
  readonly itemSelected = output<CalendarItem>();
}
