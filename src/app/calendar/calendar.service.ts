import { computed, Injectable, signal } from '@angular/core';
import { CalendarItem, itemDate } from './calendar.models';

@Injectable({ providedIn: 'root' })
export class CalendarService {
  private readonly sources = signal<Record<string, readonly CalendarItem[]>>({});
  readonly items = computed(() =>
    Object.entries(this.sources()).flatMap(([source, items]) =>
      items.map((item) => ({ ...item, id: `${source}:${item.id}` })),
    ),
  );

  /** Replace one producer's items without overwriting other producers. Invalid data throws before publishing. */
  setItems(source: string, items: readonly CalendarItem[]): void {
    if (!source.trim()) throw new Error('Calendar source must not be empty.');
    const ids = new Set<string>();
    for (const item of items) {
      const start = itemDate(item.start).getTime();
      const end = item.end ? itemDate(item.end).getTime() : start;
      if (
        !item.id ||
        !item.title.trim() ||
        ids.has(item.id) ||
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        end < start
      ) {
        throw new Error(`Invalid calendar item: ${item.id}`);
      }
      ids.add(item.id);
    }
    this.sources.update((current) => ({
      ...current,
      [source]: items.map((item) => ({ ...item })),
    }));
  }

  removeSource(source: string): void {
    this.sources.update((current) => {
      const next = { ...current };
      delete next[source];
      return next;
    });
  }
}
