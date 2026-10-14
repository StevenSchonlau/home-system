import { Component, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AccountService } from '../account.service';
import { CalendarEntryStore } from './calendar-entry-store';
import { CalendarItem, itemDate } from './calendar.models';
import { CalendarRecord } from './calendar-record.models';

@Component({
  selector: 'app-calendar-entry-form',
  imports: [FormsModule, DatePipe],
  templateUrl: './calendar-entry-form.html',
  styleUrl: './calendar-entry-form.css',
})
export class CalendarEntryForm {
  private readonly store = inject(CalendarEntryStore);
  protected readonly accounts = inject(AccountService);
  readonly created = output<CalendarItem>();
  readonly compact = input(false);
  readonly deleted = output<string>();
  readonly selected = output<CalendarItem>();
  protected readonly asDate = itemDate;
  private readonly dialog = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  protected readonly confirmingDelete = signal(false);
  protected readonly dayItems = signal<readonly CalendarItem[]>([]);
  protected readonly picking = signal(false);
  protected readonly pickerDate = signal<Date | null>(null);
  private selectedDate: Date | null = null;
  protected readonly editing = signal<CalendarItem | null>(null);
  protected readonly kind = signal<'event' | 'reminder'>('event');
  protected readonly error = signal('');
  protected readonly status = signal('');
  protected subject = '';
  protected body = '';
  protected target = '';
  protected start = '';
  protected end = '';

  protected chooseKind(kind: 'event' | 'reminder'): void {
    if (kind === 'reminder' && !this.target) this.target = this.start;
    if (kind === 'event' && !this.start && this.target) {
      this.start = this.target;
      this.end = this.local(new Date(new Date(this.target).getTime() + 3600000));
    }
    this.kind.set(kind);
    this.error.set('');
  }

  private local(value: Date): string {
    return new Date(value.getTime() - value.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
  }

  openDate(date: Date, items: readonly CalendarItem[]): void {
    this.selectedDate = date;
    this.dayItems.set(items);
    this.pickerDate.set(date);
    this.showPicker();
  }

  protected showPicker(): void {
    this.picking.set(true);
    this.editing.set(null);
    this.error.set('');
    this.status.set('');
    const dialog = this.dialog()?.nativeElement;
    if (dialog && !dialog.open) dialog.showModal();
  }

  close(): void {
    this.dialog()?.nativeElement.close();
    this.dayItems.set([]);
    this.selectedDate = null;
    this.picking.set(false);
    this.pickerDate.set(null);
  }

  protected backdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.close();
  }

  protected selectItem(item: CalendarItem): void {
    if (this.store.owns(item.id)) this.edit(item);
    else {
      this.close();
      this.selected.emit(item);
    }
  }

  protected deleteItem(): void {
    const item = this.editing();
    if (!item) return;
    try {
      this.store.delete(item.id);
      this.deleted.emit(item.id);
      this.close();
      this.status.set(`${this.kind() === 'event' ? 'Event' : 'Reminder'} deleted.`);
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not delete this item.');
    }
  }

  edit(item: CalendarItem): void {
    this.begin(item.kind === 'reminder' ? 'reminder' : 'event');
    this.editing.set(item);
    this.subject = item.title;
    this.body = item.description ?? '';
    const local = (value: string) => {
      const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
      return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    if (this.kind() === 'reminder') this.target = local(item.start);
    else {
      this.start = local(item.start);
      this.end = item.end ? local(item.end) : '';
    }
  }

  protected begin(kind: 'event' | 'reminder'): void {
    this.picking.set(false);
    this.editing.set(null);
    this.kind.set(kind);
    this.confirmingDelete.set(false);
    const dialog = this.dialog()?.nativeElement;
    if (dialog && !dialog.open) dialog.showModal();
    this.error.set('');
    this.status.set('');
    this.subject = '';
    this.body = '';
    this.target = '';
    this.start = '';
    this.end = '';
    if (this.selectedDate) {
      const start = new Date(this.selectedDate);
      start.setHours(9, 0, 0, 0);
      this.start = this.local(start);
      this.target = this.start;
      this.end = this.local(new Date(start.getTime() + 3600000));
    }
  }
  protected save(): void {
    this.error.set('');
    try {
      const iso = (value: string) => {
        if (!value) throw new Error('Complete the required date fields.');
        const date = new Date(value);
        if (!Number.isFinite(date.getTime())) throw new Error('Enter a valid date and time.');
        return date.toISOString();
      };
      const record: CalendarRecord = {
        TargetDate: this.kind() === 'reminder' ? iso(this.target) : null,
        StartDate: this.kind() === 'event' ? iso(this.start) : null,
        EndDate: this.kind() === 'event' ? iso(this.end) : null,
        Subject: this.subject.trim(),
        Body: this.body.trim(),
      };
      const item = this.editing()
        ? this.store.update(this.editing()!.id, record)
        : this.store.create(record);
      this.created.emit(item);
      this.close();
      this.status.set(
        `${this.kind() === 'event' ? 'Event' : 'Reminder'} saved in this browser for ${this.accounts.selected()}.`,
      );
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'Could not save. Please try again.');
    }
  }
}
