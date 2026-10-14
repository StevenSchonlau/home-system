import { computed, inject, Injectable, signal } from '@angular/core';
import { AccountService } from '../account.service';
import { CalendarRecord, recordToItem } from './calendar-record.models';

interface SavedRecord {
  id: string;
  record: CalendarRecord;
}
const STORAGE_KEY = 'home-system-calendar-v1';

@Injectable({ providedIn: 'root' })
export class CalendarEntryStore {
  private readonly accounts = inject(AccountService);
  private readonly records = signal<Record<string, SavedRecord[]>>(this.load());
  readonly items = computed(() =>
    (this.records()[this.accounts.selected()] ?? []).map((entry) =>
      recordToItem(`calendar-local:${entry.id}`, entry.record),
    ),
  );

  /** Browser-local storage until the app supplies a calendar GET/POST endpoint. */
  owns(id: string): boolean {
    return this.items().some((item) => item.id === id);
  }

  update(id: string, record: CalendarRecord) {
    if (!this.owns(id)) throw new Error('This item is no longer available.');
    const item = recordToItem(id, record);
    const account = this.accounts.selected();
    this.persist({
      ...this.records(),
      [account]: this.records()[account].map((entry) =>
        `calendar-local:${entry.id}` === id ? { ...entry, record: { ...record } } : entry,
      ),
    });
    return item;
  }

  delete(id: string): void {
    if (!this.owns(id)) throw new Error('This item is no longer available.');
    const account = this.accounts.selected();
    this.persist({
      ...this.records(),
      [account]: this.records()[account].filter((entry) => `calendar-local:${entry.id}` !== id),
    });
  }

  create(record: CalendarRecord) {
    const id = crypto.randomUUID();
    const item = recordToItem(`calendar-local:${id}`, record);
    const account = this.accounts.selected();
    const next = {
      ...this.records(),
      [account]: [...(this.records()[account] ?? []), { id, record: { ...record } }],
    };
    this.persist(next);
    return item;
  }

  private persist(next: Record<string, SavedRecord[]>): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      throw new Error('Could not save in this browser. Check storage permissions and try again.');
    }
    this.records.set(next);
  }

  private load(): Record<string, SavedRecord[]> {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
      const result: Record<string, SavedRecord[]> = {};
      for (const [account, entries] of Object.entries(parsed)) {
        if (!Array.isArray(entries)) continue;
        result[account] = entries.filter((entry) => {
          try {
            recordToItem(entry.id, entry.record);
            return true;
          } catch {
            return false;
          }
        });
      }
      return result;
    } catch {
      return {};
    }
  }
}
