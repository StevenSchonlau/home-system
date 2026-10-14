import { TestBed } from '@angular/core/testing';
import { AccountService } from '../account.service';
import { Calendar } from './calendar';
import { CalendarEntryStore } from './calendar-entry-store';
import { CalendarRecord, recordToItem } from './calendar-record.models';
import { CalendarService } from './calendar.service';

const event: CalendarRecord = {
  TargetDate: null,
  StartDate: '2026-10-15T10:00:00Z',
  EndDate: '2026-10-15T11:00:00Z',
  Subject: 'Appointment',
  Body: 'Bring paperwork',
};
const reminder: CalendarRecord = {
  TargetDate: '2026-10-16T10:00:00Z',
  StartDate: null,
  EndDate: null,
  Subject: 'Change filter',
  Body: 'Kitchen',
};
const originalShowModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal');
const originalClose = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close');

describe('Calendar event and reminder creation', () => {
  let saved: string | null;
  let account: string | null;
  beforeEach(() => {
    // jsdom does not implement native dialog modal behavior.
    Object.defineProperties(HTMLDialogElement.prototype, {
      showModal: {
        configurable: true,
        value: function (this: HTMLDialogElement) {
          this.setAttribute('open', '');
        },
      },
      close: {
        configurable: true,
        value: function (this: HTMLDialogElement) {
          this.removeAttribute('open');
        },
      },
    });
    saved = localStorage.getItem('home-system-calendar-v1');
    account = localStorage.getItem('dashboard-account');
    localStorage.removeItem('home-system-calendar-v1');
    TestBed.configureTestingModule({ imports: [Calendar] });
    TestBed.inject(AccountService).select('calendar-test');
  });
  afterEach(() => {
    if (originalShowModal)
      Object.defineProperty(HTMLDialogElement.prototype, 'showModal', originalShowModal);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal');
    if (originalClose) Object.defineProperty(HTMLDialogElement.prototype, 'close', originalClose);
    else Reflect.deleteProperty(HTMLDialogElement.prototype, 'close');
    TestBed.resetTestingModule();
    vi.restoreAllMocks();
    for (const [key, value] of [
      ['home-system-calendar-v1', saved],
      ['dashboard-account', account],
    ]) {
      if (value === null) localStorage.removeItem(key!);
      else localStorage.setItem(key!, value!);
    }
  });

  it('maps the five database columns to distinct scheduled events and point reminders', () => {
    expect(recordToItem('e', event)).toEqual(
      expect.objectContaining({
        kind: 'event',
        start: event.StartDate,
        end: event.EndDate,
        description: event.Body,
      }),
    );
    expect(recordToItem('r', reminder)).toEqual(
      expect.objectContaining({ kind: 'reminder', start: reminder.TargetDate, end: undefined }),
    );
    expect(recordToItem('utc', { ...reminder, TargetDate: '2026-10-16T10:00:00' }).start).toBe(
      '2026-10-16T10:00:00Z',
    );
    expect(() => recordToItem('bad', { ...event, EndDate: event.StartDate })).toThrow();
    expect(() => recordToItem('bad', { ...event, TargetDate: reminder.TargetDate })).toThrow();
    expect(() => recordToItem('bad', { ...reminder, Subject: ' ' })).toThrow();
    const calendar = TestBed.inject(CalendarService);
    calendar.setRecords('database', [{ id: 'r', record: reminder }]);
    expect(calendar.items()[0].kind).toBe('reminder');
  });

  it('persists records across reloads and isolates them by the selected account', () => {
    const store = TestBed.inject(CalendarEntryStore);
    store.create(event);
    TestBed.inject(AccountService).select('other-account');
    expect(store.items()).toEqual([]);
    store.create(reminder);
    expect(store.items()[0].kind).toBe('reminder');
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    TestBed.inject(AccountService).select('calendar-test');
    expect(TestBed.inject(CalendarEntryStore).items()[0].title).toBe('Appointment');
  });

  it('does not publish an item when browser persistence fails', () => {
    const store = TestBed.inject(CalendarEntryStore);
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('Full');
    });
    expect(() => store.create(event)).toThrow('Could not save');
    expect(store.items()).toEqual([]);
  });

  it('creates both kinds through the form and shows their selected date and details', async () => {
    const fixture = TestBed.createComponent(Calendar);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelectorAll<HTMLButtonElement>('.filters button')[1].click();
    fixture.detectChanges();
    const fill = async (name: string, value: string) => {
      const field = root.querySelector<HTMLInputElement | HTMLTextAreaElement>(`[name="${name}"]`)!;
      field.value = value;
      field.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      fixture.detectChanges();
    };
    root
      .querySelector<HTMLButtonElement>('app-calendar-entry-form .create-actions button')!
      .click();
    fixture.detectChanges();
    await fixture.whenStable();
    await fill('subject', 'New event');
    await fill('body', 'Event notes');
    await fill('start', '2026-10-15T10:00');
    await fill('end', '2026-10-15T09:00');
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    expect(root.querySelector('form [role="alert"]')?.textContent).toContain('end after');
    expect(TestBed.inject(CalendarEntryStore).items()).toHaveLength(0);
    await fill('end', '2026-10-15T11:00');
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    expect(root.querySelector('.agenda')?.textContent).toContain('New event');
    expect(root.querySelector('dialog')?.hasAttribute('open')).toBe(false);
    root.querySelector<HTMLButtonElement>('.item')!.click();
    fixture.detectChanges();
    expect(root.querySelector('dialog')?.hasAttribute('open')).toBe(true);
    expect(root.querySelector<HTMLTextAreaElement>('[name="body"]')?.value).toBe('Event notes');
    root.querySelector<HTMLButtonElement>('.modal-close')!.click();
    root
      .querySelectorAll<HTMLButtonElement>('app-calendar-entry-form .create-actions button')[1]
      .click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('[name="start"]')).toBeNull();
    await fill('subject', 'New reminder');
    await fill('target', '2026-10-16T12:00');
    root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();
    expect(root.querySelector('.item.reminder')?.textContent).toContain('New reminder');
    expect(root.querySelector('dialog')?.hasAttribute('open')).toBe(false);
    expect(TestBed.inject(CalendarEntryStore).items()).toHaveLength(2);
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();
    expect(root.querySelector('[aria-label="Create event or reminder"]')).not.toBeNull();
    expect(root.querySelector('.agenda')?.textContent).toContain('New event');
    expect(root.querySelector('.agenda')?.textContent).toContain('New reminder');
  });

  it('creates a reminder from the compact plus button without losing the entered subject', async () => {
    const fixture = TestBed.createComponent(Calendar);
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    document.body.appendChild(root);
    root.querySelector<HTMLButtonElement>('.add-icon')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const subject = root.querySelector<HTMLInputElement>('[name="subject"]')!;
    subject.value = 'Take out bins';
    subject.dispatchEvent(new Event('input'));
    const select = root.querySelector<HTMLSelectElement>('[name="kind"]')!;
    select.value = 'reminder';
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(subject.value).toBe('Take out bins');
    expect(root.querySelector('[name="start"]')).toBeNull();
    const target = root.querySelector<HTMLInputElement>('[name="target"]')!;
    target.value = '2026-10-21T09:00';
    target.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    fixture.detectChanges();
    const save = root.querySelector<HTMLButtonElement>('form button[type="submit"]')!;
    expect(save.disabled).toBe(false);
    save.click();
    fixture.detectChanges();
    expect(root.querySelector('[role="alert"]')?.textContent ?? '').toBe('');
    expect(root.querySelector('form')!.getAttribute('novalidate')).not.toBeNull();
    expect(root.querySelector<HTMLFormElement>('form')!.checkValidity()).toBe(true);
    expect(TestBed.inject(CalendarEntryStore).items()[0]).toEqual(
      expect.objectContaining({ title: 'Take out bins', kind: 'reminder', end: undefined }),
    );
    expect(root.querySelector<HTMLDialogElement>('dialog')!.open).toBe(false);
    root.remove();
  });

  it('edits and deletes shared events from either calendar view and persists the changes', async () => {
    const store = TestBed.inject(CalendarEntryStore);
    const item = store.create(event);
    const full = TestBed.createComponent(Calendar);
    const compact = TestBed.createComponent(Calendar);
    compact.componentRef.setInput('compact', true);
    full.detectChanges();
    full.nativeElement.querySelectorAll('.filters button')[1].click();
    for (const fixture of [full, compact]) {
      fixture.detectChanges();
      const root = fixture.nativeElement as HTMLElement;
      const today = new Date();
      const date = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 10);
      store.update(item.id, {
        ...event,
        StartDate: date.toISOString(),
        EndDate: new Date(date.getTime() + 3600000).toISOString(),
      });
      fixture.detectChanges();
      root.querySelector<HTMLButtonElement>('.item')!.click();
      fixture.detectChanges();
      expect(root.querySelector('dialog')?.hasAttribute('open')).toBe(true);
      await fixture.whenStable();
      const subject = root.querySelector<HTMLInputElement>('[name="subject"]')!;
      expect(subject.value).toBe('Appointment');
      subject.value = 'Updated appointment';
      subject.dispatchEvent(new Event('input'));
      await fixture.whenStable();
      root.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
      fixture.detectChanges();
      expect(store.items()[0].id).toBe(item.id);
      expect(store.items()[0].title).toBe('Updated appointment');
      full.detectChanges();
      compact.detectChanges();
      expect(full.nativeElement.querySelector('.agenda').textContent).toContain(
        'Updated appointment',
      );
      expect(compact.nativeElement.querySelector('.agenda').textContent).toContain(
        'Updated appointment',
      );
    }
    const root = compact.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('.item')!.click();
    compact.detectChanges();
    root.querySelector<HTMLButtonElement>('dialog .delete')!.click();
    compact.detectChanges();
    root.querySelector<HTMLButtonElement>('.delete-confirmation .delete')!.click();
    full.detectChanges();
    compact.detectChanges();
    expect(store.items()).toEqual([]);
    expect(full.nativeElement.querySelector('.item')).toBeNull();
    expect(root.querySelector('.item')).toBeNull();
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({});
    TestBed.inject(AccountService).select('calendar-test');
    expect(TestBed.inject(CalendarEntryStore).items()).toEqual([]);
  });

  it('keeps producer entries selectable in the date picker without offering local mutations', async () => {
    const fixture = TestBed.createComponent(Calendar);
    const date = new Date();
    date.setHours(10, 0, 0, 0);
    TestBed.inject(CalendarService).setItems('tasks', [
      { id: 'external', title: 'Group task', start: date.toISOString(), kind: 'task' },
    ]);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    const selected = vi.fn();
    fixture.componentInstance.itemSelected.subscribe(selected);
    root.querySelector<HTMLButtonElement>('.day.today')!.click();
    fixture.detectChanges();
    expect(root.querySelector('.day-items')?.textContent).toContain('Group task');
    root.querySelector<HTMLButtonElement>('.day-items button')!.click();
    fixture.detectChanges();
    expect(selected).toHaveBeenCalledWith(expect.objectContaining({ id: 'tasks:external' }));
    expect(root.querySelector('.detail')?.textContent).toContain('Group task');
    expect(root.querySelector<HTMLDialogElement>('dialog')!.open).toBe(false);
    expect(TestBed.inject(CalendarEntryStore).items()).toEqual([]);
    fixture.componentRef.setInput('items', [
      { id: 'custom', title: 'Custom event', start: date.toISOString() },
    ]);
    fixture.detectChanges();
    expect(root.querySelector('.agenda')?.textContent).toContain('Custom event');
    expect(root.querySelector('app-calendar-entry-form')).toBeNull();
  });

  it('opens a date picker before editing and keeps the selected-day agenda out of the calendar', async () => {
    const fixture = TestBed.createComponent(Calendar);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    root.querySelector<HTMLButtonElement>('.day.today')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const dialog = root.querySelector<HTMLDialogElement>('dialog')!;
    expect(dialog.open).toBe(true);
    expect(root.querySelector('form')).toBeNull();
    expect(root.querySelector('.agenda')).toBeNull();
    expect(root.querySelector('.day-items')?.textContent).toContain('No events on this date');
    root.querySelector<HTMLButtonElement>('dialog .create-actions button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    const start = root.querySelector<HTMLInputElement>('[name="start"]')!.value;
    expect(new Date(start).toDateString()).toBe(new Date().toDateString());
    expect(root.querySelector('dialog .delete')).toBeNull();
    root.querySelector<HTMLButtonElement>('.modal-close')!.click();
    expect(dialog.open).toBe(false);
    const store = TestBed.inject(CalendarEntryStore);
    store.create({
      ...event,
      StartDate: new Date(start).toISOString(),
      EndDate: new Date(new Date(start).getTime() + 3600000).toISOString(),
    });
    store.create({
      ...event,
      Subject: 'Second event',
      StartDate: new Date(start).toISOString(),
      EndDate: new Date(new Date(start).getTime() + 7200000).toISOString(),
    });
    fixture.detectChanges();
    root.querySelector<HTMLButtonElement>('.day.today')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(dialog.open).toBe(true);
    expect(root.querySelector('form')).toBeNull();
    expect(root.querySelector('.day-items')?.textContent).toContain('Appointment');
    expect(root.querySelector('.day-items')?.textContent).toContain('Second event');
    root.querySelectorAll<HTMLButtonElement>('.day-items button')[1].click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector<HTMLInputElement>('[name="subject"]')!.value).toBe('Second event');
    expect(root.querySelector('dialog .delete')).not.toBeNull();
    const back = Array.from(root.querySelectorAll<HTMLButtonElement>('dialog button')).find(
      (button) => button.textContent?.trim() === 'Back to events',
    )!;
    back.click();
    fixture.detectChanges();
    expect(root.querySelector('form')).toBeNull();
    root.querySelector<HTMLButtonElement>('dialog .create-actions button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    expect(root.querySelector('dialog .delete')).toBeNull();
    expect(root.querySelector<HTMLInputElement>('[name="start"]')!.value).toBe(start);
  });
});
