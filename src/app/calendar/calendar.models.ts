export type CalendarView = 'day' | 'week' | 'month';

export interface CalendarItem {
  /** Unique within its source. */
  id: string;
  title: string;
  /** ISO date (YYYY-MM-DD) for all-day items, or ISO timestamp with timezone. */
  start: string;
  /** Exclusive end; omit for a single date or point-in-time item. */
  end?: string;
  allDay?: boolean;
  kind?: 'task' | 'event' | 'reminder';
  description?: string;
  location?: string;
  completed?: boolean;
}

export function itemDate(value: string): Date {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00`) : new Date(value);
}

export function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function period(date: Date, view: CalendarView): { start: Date; end: Date } {
  const start = startOfDay(date);
  if (view === 'month') {
    return {
      start: new Date(date.getFullYear(), date.getMonth(), 1),
      end: new Date(date.getFullYear(), date.getMonth() + 1, 1),
    };
  }
  if (view === 'week') start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
  return { start, end: addDays(start, view === 'week' ? 7 : 1) };
}

export function itemsInRange(
  items: readonly CalendarItem[],
  start: Date,
  end: Date,
): CalendarItem[] {
  return items
    .filter((item) => {
      const first = itemDate(item.start);
      const last = item.end ? itemDate(item.end) : first;
      return (
        Number.isFinite(first.getTime()) &&
        Number.isFinite(last.getTime()) &&
        first < end &&
        (last > first ? last > start : first >= start)
      );
    })
    .sort(
      (a, b) =>
        itemDate(a.start).getTime() - itemDate(b.start).getTime() || a.title.localeCompare(b.title),
    );
}
