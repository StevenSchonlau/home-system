import { inject } from '@angular/core';
import { AccountService } from '../account.service';
import { AskPrepared } from '../ai/ask-ai/ask-ai';
import { SensorDataService } from '../sensor-data.service';
import { buildQuestionPrompt, describeRange } from './ai-prompt';
import { TimeRangeService } from './time-range.service';

// For the dashboard's "Ask AI" bar: every data source of the selected account over the selected
// time range (sampled to fit), plus the question. Call from an injection context.
export function injectDashboardQuestion(): (question: string) => AskPrepared {
  const sensorData = inject(SensorDataService);
  const timeRange = inject(TimeRangeService);
  const accounts = inject(AccountService);

  return (question) => {
    const account = accounts.selected();
    const rangeText = describeRange(timeRange.range());
    const { from, to } = timeRange.bounds();
    const series = [...sensorData.series().values()].map((s) => ({
      key: s.key,
      label: s.label,
      points: s.points.filter((p) => p.time >= from && p.time <= to),
    }));
    const prompt = buildQuestionPrompt(question, { account, rangeText, series, now: new Date() });
    if (!prompt) {
      return { error: `There's no data for ${account} in ${rangeText} to answer from.` };
    }
    const used = series.filter((s) => s.points.length > 0).length;
    return { prompt, basis: `${used} data source${used === 1 ? '' : 's'} · ${account} · ${rangeText}` };
  };
}
