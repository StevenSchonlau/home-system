import { TestBed } from '@angular/core/testing';
import { Calendar } from './calendar';
import { CalendarItem, itemsInRange, period } from './calendar.models';
import { CalendarService } from './calendar.service';

describe('Calendar date ranges', () => {
  it('uses Monday weeks across year boundaries', () => {
    const range = period(new Date(2027, 0, 1), 'week');
    expect(range.start).toEqual(new Date(2026, 11, 28));
    expect(range.end).toEqual(new Date(2027, 0, 4));
  });

  it('includes spanning items and excludes an exclusive end at midnight', () => {
    const items: CalendarItem[] = [
      { id: 'span', title: 'Trip', start: '2026-10-12', end: '2026-10-15' },
      { id: 'ended', title: 'Done', start: '2026-10-12', end: '2026-10-14' },
      { id: 'point', title: 'Task', start: '2026-10-14' },
      { id: 'next', title: 'Tomorrow', start: '2026-10-15' },
    ];
    expect(
      itemsInRange(items, new Date(2026, 9, 14), new Date(2026, 9, 15)).map((item) => item.id),
    ).toEqual(['span', 'point']);
  });
});

describe('Calendar integration', () => {
  it('isolates producers and rejects invalid updates without losing data', () => {
    const service = new CalendarService();
    const item = { id: '1', title: 'Task', start: '2026-10-14' };
    service.setItems('tasks', [item]);
    service.setItems('events', [item]);
    item.title = 'Mutated';
    expect(service.items().map((item) => item.id)).toEqual(['tasks:1', 'events:1']);
    expect(service.items()[0].title).toBe('Task');
    expect(() => service.setItems('tasks', [{ ...item, start: 'invalid' }])).toThrow();
    expect(service.items()).toHaveLength(2);
    service.removeSource('tasks');
    expect(service.items()[0].id).toBe('events:1');
  });

  it('renders shared data, filters periods, and emits the selected item', async () => {
    await TestBed.configureTestingModule({ imports: [Calendar] }).compileComponents();
    const fixture = TestBed.createComponent(Calendar);
    const now = new Date();
    const item = {
      id: '1',
      title: 'Current task',
      start: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12).toISOString(),
      kind: 'task' as const,
    };
    TestBed.inject(CalendarService).setItems('tasks', [item]);
    fixture.componentRef.setInput('compact', true);
    fixture.detectChanges();
    const root = fixture.nativeElement as HTMLElement;
    expect(root.textContent).toContain('Current task');
    const day = Array.from(root.querySelectorAll<HTMLButtonElement>('.filters button')).find(
      (button) => button.textContent?.trim() === 'day',
    )!;
    day.click();
    fixture.detectChanges();
    expect(day.getAttribute('aria-pressed')).toBe('true');
    const selected = vi.fn();
    fixture.componentInstance.itemSelected.subscribe(selected);
    root.querySelector<HTMLButtonElement>('.item')!.click();
    fixture.detectChanges();
    expect(selected).toHaveBeenCalledWith(expect.objectContaining({ id: 'tasks:1' }));
    expect(root.querySelector('.detail')).not.toBeNull();
    fixture.componentRef.setInput('items', []);
    fixture.detectChanges();
    expect(root.querySelectorAll('.item')).toHaveLength(0);
    expect(root.textContent).toContain('No scheduled items');
  });
});
