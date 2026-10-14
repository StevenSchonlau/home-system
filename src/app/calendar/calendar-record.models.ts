import { CalendarItem, itemDate } from './calendar.models';

/** Exact database payload. Reminders use TargetDate; events use StartDate/EndDate. */
export interface CalendarRecord {
  TargetDate: string | null;
  StartDate: string | null;
  EndDate: string | null;
  Subject: string;
  Body: string;
}

function normalizedDate(value: string): string {
  // Like the sensor API, database timestamps without an offset are UTC.
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return /(Z|[+-]\d{2}:?\d{2})$/i.test(value) ? value : `${value}Z`;
}

export function recordToItem(id: string, record: CalendarRecord): CalendarItem {
  const reminder = !!record.TargetDate && !record.StartDate && !record.EndDate;
  const event = !record.TargetDate && !!record.StartDate && !!record.EndDate;
  if (!id || !record.Subject?.trim() || (!reminder && !event)) {
    throw new Error('Use a target date for reminders, or a start and end date for events.');
  }
  const start = normalizedDate(reminder ? record.TargetDate! : record.StartDate!);
  const end = event ? normalizedDate(record.EndDate!) : undefined;
  if (
    !Number.isFinite(itemDate(start).getTime()) ||
    (end && (!Number.isFinite(itemDate(end).getTime()) || itemDate(end) <= itemDate(start)))
  ) {
    throw new Error('Enter valid dates. An event must end after it starts.');
  }
  return {
    id,
    title: record.Subject.trim(),
    description: record.Body || '',
    start,
    end,
    allDay: start.length === 10,
    kind: reminder ? 'reminder' : 'event',
  };
}
