import { isNumeric, SensorPoint } from '../sensor-data.service';
import { TimeRange } from './time-range.service';

// Prompts for Gemini about sensor data: the AI summary tile and the "Ask AI" bar.
// Large series are sampled down (numbers: LTTB, text: value changes); summary numbers use every reading.

// At most this many readings per series go into a prompt (3 series stay well under ~10k chars).
export const MAX_POINTS_PER_SERIES = 120;

// A question about the whole account shares this many readings across all of its series.
export const QUESTION_POINT_BUDGET = 1500;

export interface PromptSeries {
  label: string; // "Thermostat – temperature"
  key: string; // "Thermostat:temperature" (sensorType:dataKey)
  points: SensorPoint[]; // readings in the selected time range, oldest first
}

export interface PromptInput {
  account: string;
  rangeText: string; // e.g. "the last 24 hours"
  series: PromptSeries[];
  now: Date;
}

// The prompt for one AI summary tile, or null if none of its series has readings in the range.
export function buildSummaryPrompt({ account, rangeText, series, now }: PromptInput): string | null {
  if (series.every((s) => s.points.length === 0)) {
    return null;
  }
  return [
    'You are the assistant for a home monitoring dashboard.',
    `Summarize the sensor data below for the account "${account}" over ${rangeText}.`,
    timeLine(now),
    'Write 2-4 short sentences of plain text (no markdown, no lists, no headings): the current state,',
    'notable trends, spikes, drops or unusual readings with approximate times, and how the series relate',
    'if there are several. Only use the data given; if it is too sparse to say much, say so briefly.',
    'Long series were sampled down to keep this short; the summary numbers use every reading.',
    '',
    ...series.map((s) => describeSeries(s, MAX_POINTS_PER_SERIES)),
  ].join('\n');
}

// The prompt for a question about all of an account's data, or null if nothing has readings in range.
// The readings budget is split across the series, so accounts with many sensors stay a sensible size.
export function buildQuestionPrompt(question: string, { account, rangeText, series, now }: PromptInput): string | null {
  const withData = series.filter((s) => s.points.length > 0);
  if (withData.length === 0) {
    return null;
  }
  const perSeries = Math.max(20, Math.min(MAX_POINTS_PER_SERIES, Math.floor(QUESTION_POINT_BUDGET / withData.length)));
  const empty = series.filter((s) => s.points.length === 0).map((s) => s.label);
  return [
    'You are the assistant for a home monitoring dashboard.',
    `Answer the question using the sensor data below for the account "${account}" over ${rangeText}.`,
    timeLine(now),
    'Answer briefly and directly in plain text (no markdown, no headings); a few sentences or short lines.',
    'Only use the data given. If it does not contain what is needed, say so and mention what data is available.',
    'Long series were sampled down to keep this short; the summary numbers use every reading.',
    '',
    `Question: ${question}`,
    '',
    `Data: ${withData.length} series with readings in this time range.` +
      (empty.length ? ` No readings in this range for: ${empty.join(', ')}.` : ''),
    '',
    ...withData.map((s) => describeSeries(s, perSeries)),
  ].join('\n');
}

// "the last 24 hours" / "2026-10-13 08:00 to now"
export function describeRange(range: TimeRange): string {
  if (range.mode === 'last') {
    const unit = range.amount === 1 ? range.unit.replace(/s$/, '') : range.unit;
    return `the last ${range.amount} ${unit}`;
  }
  const start = range.start ? range.start.replace('T', ' ') : 'the earliest reading';
  const end = range.end ? range.end.replace('T', ' ') : 'now';
  return `${start} to ${end}`;
}

function timeLine(now: Date): string {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return `Times are local (${timeZone}); it is now ${formatTime(now.getTime())}.`;
}

function describeSeries({ label, key, points }: PromptSeries, maxPoints: number): string {
  const [sensorType, dataKey] = splitKey(key);
  const heading = `## ${label} (sensor type "${sensorType}", data key "${dataKey}")`;
  if (points.length === 0) {
    return `${heading}\nNo readings in this time range.\n`;
  }
  return points.every((p) => isNumeric(p.value))
    ? describeNumeric(heading, points, maxPoints)
    : describeText(heading, points, maxPoints);
}

function describeNumeric(heading: string, points: SensorPoint[], maxPoints: number): string {
  const numeric = points.map((p) => ({ time: p.time, value: Number(p.value) }));
  const values = numeric.map((p) => p.value);
  const min = numeric.reduce((a, b) => (b.value < a.value ? b : a));
  const max = numeric.reduce((a, b) => (b.value > a.value ? b : a));
  const average = values.reduce((sum, v) => sum + v, 0) / values.length;
  const sampled = lttb(numeric, maxPoints);
  return [
    heading,
    `Readings in range: ${points.length}${sampledNote(sampled.length, points.length, 'largest-triangle-three-buckets, keeps spikes and the overall shape')}`,
    `First ${round(numeric[0].value)} at ${formatTime(numeric[0].time)}; latest ${round(numeric.at(-1)!.value)} at ${formatTime(numeric.at(-1)!.time)}.`,
    `Min ${round(min.value)} at ${formatTime(min.time)}; max ${round(max.value)} at ${formatTime(max.time)}; average ${round(average)}.`,
    'Readings (time, value):',
    ...sampled.map((p) => `${formatTime(p.time)}  ${round(p.value)}`),
    '',
  ].join('\n');
}

function describeText(heading: string, points: SensorPoint[], maxPoints: number): string {
  const counts = new Map<string, number>();
  for (const p of points) {
    counts.set(p.value, (counts.get(p.value) ?? 0) + 1);
  }
  const countText = [...counts]
    .sort((a, b) => b[1] - a[1])
    .map(([value, n]) => `"${value}" ×${n}`)
    .join(', ');
  // Only the moments the value changed (plus the first and latest reading) carry information.
  const changes = points.filter((p, i) => i === 0 || i === points.length - 1 || p.value !== points[i - 1].value);
  const sampled = evenSample(changes, maxPoints);
  return [
    heading,
    `Readings in range: ${points.length}. Value counts: ${countText}.`,
    `Latest "${points.at(-1)!.value}" at ${formatTime(points.at(-1)!.time)}.`,
    `Value changes (time, new value)${sampledNote(sampled.length, changes.length, 'evenly spaced')}:`,
    ...sampled.map((p) => `${formatTime(p.time)}  ${p.value}`),
    '',
  ].join('\n');
}

function sampledNote(shown: number, total: number, how: string): string {
  return shown < total ? ` (${shown} of ${total} shown, sampled ${how})` : '';
}

// Largest-Triangle-Three-Buckets downsampling: keeps the first and last point and, per bucket,
// the point that makes the biggest triangle with its neighbours, so peaks and dips survive.
export function lttb<T extends { time: number; value: number }>(points: T[], threshold: number): T[] {
  if (threshold >= points.length || threshold < 3) {
    return points;
  }
  const sampled = [points[0]];
  const bucketSize = (points.length - 2) / (threshold - 2);
  let a = 0;
  for (let i = 0; i < threshold - 2; i++) {
    // Average of the next bucket.
    const nextStart = Math.floor((i + 1) * bucketSize) + 1;
    const nextEnd = Math.min(Math.floor((i + 2) * bucketSize) + 1, points.length);
    let avgTime = 0;
    let avgValue = 0;
    for (let j = nextStart; j < nextEnd; j++) {
      avgTime += points[j].time;
      avgValue += points[j].value;
    }
    avgTime /= nextEnd - nextStart;
    avgValue /= nextEnd - nextStart;

    // Point in this bucket with the largest triangle (previous pick, it, next bucket's average).
    const start = Math.floor(i * bucketSize) + 1;
    const end = Math.floor((i + 1) * bucketSize) + 1;
    let maxArea = -1;
    let pick = start;
    for (let j = start; j < end; j++) {
      const area = Math.abs(
        (points[a].time - avgTime) * (points[j].value - points[a].value) -
          (points[a].time - points[j].time) * (avgValue - points[a].value),
      );
      if (area > maxArea) {
        maxArea = area;
        pick = j;
      }
    }
    sampled.push(points[pick]);
    a = pick;
  }
  sampled.push(points[points.length - 1]);
  return sampled;
}

// Evenly spaced picks that always include the first and last item.
export function evenSample<T>(items: T[], max: number): T[] {
  if (items.length <= max || max < 2) {
    return items;
  }
  const step = (items.length - 1) / (max - 1);
  return Array.from({ length: max }, (_, i) => items[Math.round(i * step)]);
}

function splitKey(key: string): [string, string] {
  const at = key.indexOf(':');
  return at === -1 ? [key, ''] : [key.slice(0, at), key.slice(at + 1)];
}

function round(value: number): string {
  return String(Math.round(value * 100) / 100);
}

// "2026-10-14 09:05:12" in local time (seconds keep bursts of readings in order).
function formatTime(epochMs: number): string {
  const d = new Date(epochMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}
