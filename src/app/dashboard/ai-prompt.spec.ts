import {
  buildQuestionPrompt,
  buildSummaryPrompt,
  evenSample,
  lttb,
  MAX_POINTS_PER_SERIES,
  QUESTION_POINT_BUDGET,
} from './ai-prompt';

const HOUR = 3_600_000;

describe('AI prompts', () => {
  it('downsamples with LTTB, keeping the first, last and spike points', () => {
    const points = Array.from({ length: 1000 }, (_, i) => ({ time: i * HOUR, value: i === 500 ? 99 : 20 }));
    const sampled = lttb(points, 50);
    expect(sampled).toHaveLength(50);
    expect(sampled[0]).toBe(points[0]);
    expect(sampled.at(-1)).toBe(points.at(-1));
    expect(sampled.some((p) => p.value === 99)).toBe(true);
  });

  it('leaves short series and lists alone', () => {
    const points = [1, 2, 3].map((v) => ({ time: v, value: v }));
    expect(lttb(points, 50)).toBe(points);
    expect(evenSample([1, 2, 3], 10)).toEqual([1, 2, 3]);
    expect(evenSample([0, 1, 2, 3, 4, 5, 6, 7, 8, 9], 4)).toEqual([0, 3, 6, 9]);
  });

  it('includes the account, series name and key, and caps the readings', () => {
    const points = Array.from({ length: 500 }, (_, i) => ({ time: i * HOUR, value: String(20 + (i % 7)) }));
    const prompt = buildSummaryPrompt({
      account: 'Steven',
      rangeText: 'the last 24 hours',
      series: [{ label: 'thermostat – temp', key: 'thermostat:temp', points }],
      now: new Date(),
    })!;
    expect(prompt).toContain('"Steven"');
    expect(prompt).toContain('thermostat – temp (sensor type "thermostat", data key "temp")');
    expect(prompt).toContain('Readings in range: 500');
    expect(prompt).toContain(`${MAX_POINTS_PER_SERIES} of 500 shown`);
    const readingLines = prompt.split('\n').filter((line) => /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d {2}/.test(line));
    expect(readingLines).toHaveLength(MAX_POINTS_PER_SERIES);
  });

  it('summarizes text series by counts and value changes', () => {
    const values = ['off', 'off', 'on', 'on', 'on', 'off'];
    const prompt = buildSummaryPrompt({
      account: 'Steven',
      rangeText: 'the last day',
      series: [{ label: 'thermostat – status', key: 'thermostat:status', points: values.map((value, i) => ({ time: i * HOUR, value })) }],
      now: new Date(),
    })!;
    expect(prompt).toContain('Value counts: "off" ×3, "on" ×3.');
    const changeLines = prompt.split('\n').filter((line) => /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d {2}(on|off)$/.test(line));
    expect(changeLines).toHaveLength(3); // first "off", change to "on", change back to "off" (also the latest)
  });

  it('returns null when nothing is in range', () => {
    expect(
      buildSummaryPrompt({ account: 'Steven', rangeText: 'x', series: [{ label: 'a', key: 'a:b', points: [] }], now: new Date() }),
    ).toBeNull();
  });

  it('builds a question prompt from all series, sharing the readings budget', () => {
    const points = Array.from({ length: 300 }, (_, i) => ({ time: i * HOUR, value: String(i % 10) }));
    const series = Array.from({ length: 30 }, (_, i) => ({ label: `sensor ${i} – value`, key: `sensor${i}:value`, points }));
    series.push({ label: 'garage – door', key: 'garage:door', points: [] });
    const prompt = buildQuestionPrompt('Which sensor changed the most?', {
      account: 'Steven',
      rangeText: 'the last 24 hours',
      series,
      now: new Date(),
    })!;
    expect(prompt).toContain('Question: Which sensor changed the most?');
    expect(prompt).toContain('"Steven"');
    expect(prompt).toContain('Data: 30 series with readings in this time range. No readings in this range for: garage – door.');
    const perSeries = QUESTION_POINT_BUDGET / 30;
    expect(prompt).toContain(`${perSeries} of 300 shown`);
    const readingLines = prompt.split('\n').filter((line) => /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d {2}/.test(line));
    expect(readingLines).toHaveLength(QUESTION_POINT_BUDGET);
  });

  it('returns no question prompt when nothing has readings', () => {
    expect(
      buildQuestionPrompt('hi', { account: 'Steven', rangeText: 'x', series: [{ label: 'a', key: 'a:b', points: [] }], now: new Date() }),
    ).toBeNull();
  });
});
