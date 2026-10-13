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

`DashboardConfig` / `DashboardTileConfig` currently describe sensor tiles (`size`, sensor `fields`, and `showGraph`); they do not represent scheduled items. `SensorReading.dateTime` timestamps observations, not upcoming tasks or appointments. The calendar does not convert those readings into schedule entries. No task/appointment model or backend exists in the current app, so producers adapt their future models to `CalendarItem` at their feature boundary. Both dashboard and full page read the same root-provided `CalendarService`, using the app's existing standalone-component and signal patterns. The calendar remains empty until a producer supplies items.

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
