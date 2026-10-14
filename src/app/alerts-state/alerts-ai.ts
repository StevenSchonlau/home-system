import { inject } from '@angular/core';
import { AskPrepared } from '../ai/ask-ai/ask-ai';
import { AlertInfo, gradeFor, SCORES } from './alerts.catalog';
import { AlertsService, QueueEntry } from './alerts.service';
import { HOME_SENSORS, MISSING_SENSOR } from './home-sensors.mock';

// Prompts for Gemini about the Overview page: the event queue, unaddressed reminders, the home/car
// insurance scores and the home sensors (the same data the page shows).

export interface AlertsSnapshot {
  queue: QueueEntry[]; // display order: alerts first, then reminders, oldest first
  openIssues: AlertInfo[];
  now: Date;
}

export function buildAlertsSummaryPrompt(snapshot: AlertsSnapshot): string {
  return [
    "You are the assistant for a home's alerts, reminders, sensors and insurance overview.",
    'Write 2-4 short sentences of plain text (no markdown, no lists): what needs attention first',
    '(active alerts), any unaddressed reminders and what they add to insurance costs, sensors that need a',
    'check, and the most useful next step. If everything is clear, say so in one friendly sentence.',
    'Only use the data given.',
    '',
    describeAlertsState(snapshot),
  ].join('\n');
}

export function buildAlertsQuestionPrompt(question: string, snapshot: AlertsSnapshot): string {
  return [
    "You are the assistant for a home's alerts, reminders, sensors and insurance overview.",
    'Answer the question using the overview data below. Answer briefly and directly in plain text',
    '(no markdown, no headings). Only use the data given; if it does not cover the question, say so.',
    'The insurance numbers are demo estimates, not real quotes.',
    '',
    `Question: ${question}`,
    '',
    describeAlertsState(snapshot),
  ].join('\n');
}

// For the Overview's "Ask AI" bar. Call from an injection context.
export function injectOverviewQuestion(): (question: string) => AskPrepared {
  const alerts = inject(AlertsService);
  return (question) => {
    const snapshot = { queue: alerts.sortedQueue(), openIssues: alerts.openIssues(), now: new Date() };
    const queued = snapshot.queue.length;
    const open = snapshot.openIssues.length;
    return {
      prompt: buildAlertsQuestionPrompt(question, snapshot),
      basis:
        `${queued} queued event${queued === 1 ? '' : 's'} · ` +
        `${open} unaddressed reminder${open === 1 ? '' : 's'} · insurance scores · home sensors`,
    };
  };
}

export function describeAlertsState({ queue, openIssues, now }: AlertsSnapshot): string {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const lines = [`Times are local (${timeZone}); it is now ${formatTime(now)}.`, '', '## Insurance scores (demo estimates)'];

  for (const asset of ['home', 'car'] as const) {
    const settings = SCORES[asset];
    const issues = openIssues.filter((i) => i.asset === asset);
    const points = issues.reduce((sum, i) => sum + (i.penalty ?? 0), 0);
    const added = points * settings.costPerPoint;
    lines.push(
      `${asset === 'home' ? 'Home' : 'Car'}: grade ${gradeFor(points)} (A+ means no unaddressed reminders); ` +
        `value ${money(settings.value)}; baseline insurance ${money(settings.baseline)}/yr; ` +
        `unaddressed reminders add ${money(added)}/yr (estimated total ${money(settings.baseline + added)}/yr).`,
    );
    for (const issue of issues) {
      const queued = queue.some((e) => e.info === issue);
      lines.push(
        `- Unaddressed: ${issue.name}, +${money((issue.penalty ?? 0) * settings.costPerPoint)}/yr` +
          (queued ? '' : ' (dismissed from the queue but still not fixed)'),
      );
    }
  }

  lines.push('', '## Home sensors (demo data)');
  for (const sensor of HOME_SENSORS) {
    lines.push(
      `- ${sensor.name} (${sensor.location}): ${sensor.reading}, ${sensor.status === 'ok' ? 'OK' : 'needs a check'}. ${sensor.detail}.`,
    );
  }
  lines.push(
    `- Not connected: ${MISSING_SENSOR.name}. Connecting one would save about ` +
      `${money(MISSING_SENSOR.yearlySavings)}/yr on home insurance; it ${MISSING_SENSOR.reason}.`,
  );

  lines.push('', '## Event queue (alerts first, then reminders; oldest first)');
  if (queue.length === 0) {
    lines.push('The queue is empty: all statuses are green.');
  }
  for (const { info, time } of queue) {
    // Calendar reminders carry their due time; other events the time they happened.
    const when = `${info.calendarId !== undefined ? 'from the calendar, due' : 'since'} ${formatTime(time)}`;
    lines.push(
      `- ${info.type.toUpperCase()}: ${info.name} ${when}. ${info.title}: ${info.message} ` +
        `Options: ${info.buttons.map((b) => b.label).join(', ')}.`,
    );
  }
  return lines.join('\n');
}

function money(amount: number): string {
  return amount.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

// "2026-10-14 09:05" in local time.
function formatTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
