import { DatePipe } from '@angular/common';
import { Component, computed, inject, input, output, signal, viewChild } from '@angular/core';
import { CalendarService } from './calendar.service';
import { CalendarEntryForm } from './calendar-entry-form';
import { CalendarEntryStore } from './calendar-entry-store';
import {
  addDays,
  CalendarItem,
  CalendarView,
  itemDate,
  itemsInRange,
  period,
  startOfDay,
} from './calendar.models';

@Component({
  selector: 'app-calendar',
  imports: [DatePipe, CalendarEntryForm],
  templateUrl: './calendar.html',
  styleUrl: './calendar.css',
})
export class Calendar {
  private readonly service = inject(CalendarService);
  private readonly entries = inject(CalendarEntryStore);
  /** Omit to use shared CalendarService data. An explicit empty array shows an empty calendar. */
  readonly items = input<readonly CalendarItem[] | undefined>();
  readonly compact = input(false);
  readonly itemSelected = output<CalendarItem>();
  protected readonly view = signal<CalendarView>('month');
  protected readonly anchor = signal(startOfDay(new Date()));
  protected readonly selectedDay = signal(startOfDay(new Date()));
  protected readonly views: CalendarView[] = ['day', 'week', 'month'];
  protected readonly weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  protected readonly data = computed(
    () => this.items() ?? [...this.service.items(), ...this.entries.items()],
  );
  protected readonly range = computed(() => period(this.anchor(), this.view()));
  protected readonly visibleItems = computed(() =>
    itemsInRange(this.data(), this.range().start, this.range().end),
  );
  protected readonly days = computed(() => {
    const month = period(this.anchor(), 'month');
    const first = period(month.start, 'week').start;
    return Array.from({ length: 42 }, (_, index) => {
      const date = addDays(first, index);
      return {
        date,
        items: itemsInRange(this.data(), date, addDays(date, 1)),
        inMonth: date.getMonth() === this.anchor().getMonth(),
      };
    });
  });
  protected readonly agenda = computed(() =>
    !this.compact() && this.view() === 'month'
      ? itemsInRange(this.data(), this.selectedDay(), addDays(this.selectedDay(), 1))
      : this.visibleItems(),
  );
  protected readonly label = computed(() => {
    const format = (date: Date) =>
      date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const range = this.range();
    return this.view() === 'month'
      ? this.anchor().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
      : this.view() === 'day'
        ? format(range.start)
        : `${format(range.start)} – ${format(addDays(range.end, -1))}`;
  });
  protected readonly detail = signal<CalendarItem | null>(null);
  protected readonly entryForm = viewChild(CalendarEntryForm);
  protected editable(item: CalendarItem): boolean {
    return this.items() === undefined && this.entries.owns(item.id);
  }
  protected readonly asDate = itemDate;

  protected changeView(view: CalendarView): void {
    this.view.set(view);
    this.detail.set(null);
  }
  protected move(direction: number): void {
    const date = new Date(this.anchor());
    if (this.view() === 'month') {
      date.setDate(1);
      date.setMonth(date.getMonth() + direction);
    } else date.setDate(date.getDate() + direction * (this.view() === 'week' ? 7 : 1));
    this.anchor.set(date);
    this.selectedDay.set(date);
    this.detail.set(null);
  }
  protected today(): void {
    const date = startOfDay(new Date());
    this.anchor.set(date);
    this.selectedDay.set(date);
    this.detail.set(null);
  }
  protected sameDay(a: Date, b: Date): boolean {
    return a.toDateString() === b.toDateString();
  }
  protected isToday(date: Date): boolean {
    return this.sameDay(date, new Date());
  }
  protected selectDay(date: Date): void {
    this.selectedDay.set(date);
    this.anchor.set(date);
    this.detail.set(null);
    if (this.items() === undefined) {
      this.entryForm()?.openDate(date, itemsInRange(this.data(), date, addDays(date, 1)));
    }
  }
  protected selectItem(item: CalendarItem): void {
    this.detail.set(null);
    if (this.editable(item)) this.entryForm()?.edit(item);
    else this.detail.set(item);
    this.itemSelected.emit(item);
  }

  protected entryCreated(item: CalendarItem): void {
    const date = startOfDay(itemDate(item.start));
    this.anchor.set(date);
    this.selectedDay.set(date);
    this.detail.set(null);
  }
}
