# Calendar integration

## Regression checks before pushing

From `home-system`, with Node 22.22.3 or another Angular-supported version:

```powershell
npm ci
npm test -- --watch=false
npm run build
git diff --check
```

If the installed Node version is older, run the checks with a temporary compatible runtime:

```powershell
npx --yes --package=node@22.22.3 node node_modules/@angular/cli/bin/ng.js test --watch=false
npx --yes --package=node@22.22.3 node node_modules/@angular/cli/bin/ng.js build
```

Calendar regression tests cover date boundaries, source isolation, shared data across routes, global navigation, calendar filters, sensor filter independence, layout import/persistence/reorder/remove, invalid-import recovery, sensor error rendering, and theme switching. Existing weather and air-quality tests run in the same suite. Tests use simulated DOM and controlled data; visually check `/dashboard` and `/calendar` at desktop/mobile widths in both themes, and separately check live sensor backend connectivity.

The full page is available at `/calendar`. The dashboard includes a compact calendar widget and an **Open calendar** toolbar link. The widget sits outside the draggable sensor tile grid, so sensor tile sizing, ordering, import/export, and configuration remain unchanged.

For additional placements, import `CalendarWidget` from `./calendar/calendar-widget` (adjust relative path) into the host component's `imports`, then place `<app-calendar-widget />` in its template. It includes day/week/month filters, period navigation, item details, and a full-page link. Month is the initial filter; weeks start on Monday. The widget lists items for the selected period; the page also has a month grid with a selected-day agenda.

## Existing app models

`DashboardConfig` / `DashboardTileConfig` describe sensor tiles; they do not represent scheduled items. `SensorReading.dateTime` timestamps observations, not upcoming tasks or appointments. The calendar does not convert those readings into schedule entries. Both dashboard and full page read the root-provided `CalendarService` and `CalendarEntryStore`, using the app's existing standalone-component and signal patterns.

## Creating events and reminders

The full calendar provides **Add event** and **Add reminder**; the dashboard widget uses a compact plus button. Both open the same modal with an Event/Reminder selector for creation. Date clicks open an item picker; browser-local entries can be edited or deleted with confirmation. Producer entries remain read-only and retain the `itemSelected` output. Events require a start and end; reminders use one target date/time. Saving selects the item's day automatically. The month grid uses the picker instead of a separate selected-day list; explicit `[items]` calendars retain their read-only agenda.

Records use the five database columns exactly:

| Column | Event | Reminder |
| --- | --- | --- |
| `TargetDate` | `null` | Target timestamp |
| `StartDate` | Start timestamp | `null` |
| `EndDate` | Exclusive end timestamp | `null` |
| `Subject` | Title | Title |
| `Body` | Notes | Notes |

This convention distinguishes the two kinds without adding a database type column. Confirm it with the backend before connecting its API. Form dates use browser-local time and serialize to UTC ISO timestamps. Fetched database timestamps without a timezone are treated as UTC, matching the existing sensor API convention; date-only values stay local all-day dates.

Creation, editing, and deletion save to browser localStorage (`home-system-calendar-v1`), separated by `AccountService.selected()`. Changes persist across reloads in that browser. Storage errors leave the modal open and do not publish unsaved changes. The group's `CalendarRemindersService` separately polls `GET /Calendar` for reminders due today and supplies the Overview alert queue. Local modal entries do not reach that endpoint or queue and do not sync across devices. Before connecting writes, establish the API's mutation routes, account-scoping rules, IDs, and timestamp/null conventions; do not infer those contracts from the database column names. The read-only API currently uses camelCase fields, whereas `CalendarRecord` uses database column names.

`recordToItem(id, record)` maps a database row into the display model. `CalendarService.setRecords(source, [{ id, record }])` publishes fetched rows using stable IDs supplied by the backend or producer; IDs are not inferred from mutable subject/body text. The API endpoint, ID convention, and account-scoping contract still need to be supplied for database reads/writes. Browser-local entries and producer items are shown together; explicit `[items]` input continues to override both.

Other app features can inject `CalendarService` and publish their data:

```ts
private readonly calendar = inject(CalendarService);

// Call whenever this feature's data changes. Replace only this source's items.
this.calendar.setItems('tasks', [
  { id: 'task-42', title: 'Replace air filter', start: '2026-10-15', kind: 'task', allDay: true },
]);
```

Use separate source names for tasks, appointments, reminders, etc. `removeSource('tasks')` clears just that source. Items are copied on publication; IDs emitted from shared data are prefixed with the source. The service is in-memory: source features own fetching, persistence, and refreshing after reload. No example items are inserted into real user schedules.

Alternatively, pass a reactive array directly: `<app-calendar-widget [items]="scheduledItems()" (itemSelected)="openItem($event)" />`. Direct input overrides shared data, including an empty array. `Calendar` supports the same inputs/output and `[compact]="true"`.

Use `YYYY-MM-DD` for local all-day dates, and ISO timestamps with explicit timezone for timed entries. `end` is exclusive (an all-day item spanning October 15–16 ends on `2026-10-17`). Items spanning periods appear in each intersecting period; point items appear on their start date. Completed tasks stay visible with a strikethrough. Invalid timestamps, duplicate source IDs, and backwards ranges are rejected before updating the service. Recurrence must be expanded into individual occurrences by the producer.
