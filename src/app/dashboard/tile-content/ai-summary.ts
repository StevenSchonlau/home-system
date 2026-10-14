import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { AccountService } from '../../account.service';
import { geminiErrorMessage, GeminiService } from '../../gemini.service';
import { SensorDataService } from '../../sensor-data.service';
import { buildSummaryPrompt, describeRange } from '../ai-prompt';
import { TimeRangeService } from '../time-range.service';

interface Summary {
  text: string;
  at: Date;
}

// Summaries by tile (account + entries + time range), kept while the app is open so moving between
// pages doesn't ask Gemini again. ↻ always asks again.
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, Summary>();

// Gemini's summary of the tile's 1-3 series over the selected time range. Asks when the tile first
// has data and when the account, entries or time range change. Live data updates don't re-ask.
@Component({
  selector: 'app-ai-summary',
  imports: [DatePipe],
  template: `
    <p class="title">AI summary</p>
    @if (loading()) {
      <p class="muted" role="status">Asking Gemini…</p>
    } @else if (error()) {
      <p class="error" role="alert">{{ error() }}</p>
    } @else if (summary(); as summary) {
      <p class="text">{{ summary.text }}</p>
    } @else {
      <p class="muted">{{ status() }}</p>
    }
    <div class="footer">
      @if (summary(); as summary) {
        <span class="muted">Gemini · {{ summary.at | date: 'shortTime' }}</span>
      }
      <button type="button" class="refresh" (click)="refresh()" [disabled]="loading()" title="Ask Gemini again">
        ↻ Refresh
      </button>
    </div>
  `,
  styles: `
    :host { display: flex; flex-direction: column; gap: 0.5rem; height: 100%; }
    p { margin: 0; }
    .title { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
    .text { line-height: 1.5; white-space: pre-line; }
    .muted { color: var(--text-muted); font-size: 0.9rem; }
    .error { color: var(--danger); font-size: 0.9rem; }
    .footer { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; margin-top: auto; }
    .refresh {
      margin-left: auto; padding: 0.25rem 0.6rem; border: 1px solid var(--border); border-radius: 999px;
      background: var(--surface); color: var(--text); font: inherit; font-size: 0.8rem; cursor: pointer;
    }
    .refresh:hover { background: var(--surface-hover); }
    .refresh:disabled { opacity: 0.5; cursor: wait; }
  `,
})
export class AiSummary {
  private readonly sensorData = inject(SensorDataService);
  private readonly timeRange = inject(TimeRangeService);
  private readonly accounts = inject(AccountService);
  private readonly gemini = inject(GeminiService);
  readonly fields = input.required<string[]>();

  protected readonly summary = signal<Summary | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');
  protected readonly status = signal('Waiting for data…');

  // True once the account's sensor data has arrived (flips once, so polling doesn't re-ask).
  private readonly dataLoaded = computed(() => this.sensorData.series().size > 0);
  private readonly cacheKey = computed(() =>
    JSON.stringify([this.accounts.selected(), this.fields(), this.timeRange.range()]),
  );
  private request?: Subscription;

  constructor() {
    effect(() => {
      const key = this.cacheKey();
      const loaded = this.dataLoaded();
      untracked(() => this.load(key, loaded, false));
    });
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  protected refresh(): void {
    this.load(this.cacheKey(), this.dataLoaded(), true);
  }

  private load(key: string, loaded: boolean, force: boolean): void {
    const cached = cache.get(key);
    if (!force && cached && Date.now() - cached.at.getTime() < CACHE_MS) {
      this.show(cached);
      return;
    }
    this.request?.unsubscribe();
    this.summary.set(null);
    this.error.set('');
    if (!loaded) {
      this.status.set('Waiting for data…');
      return;
    }

    const { from, to } = this.timeRange.bounds();
    const prompt = buildSummaryPrompt({
      account: this.accounts.selected(),
      rangeText: describeRange(this.timeRange.range()),
      now: new Date(),
      series: this.fields().map((key) => ({
        key,
        label: this.sensorData.label(key),
        points: (this.sensorData.series().get(key)?.points ?? []).filter((p) => p.time >= from && p.time <= to),
      })),
    });
    if (!prompt) {
      this.status.set('No readings in this time range to summarize.');
      return;
    }

    this.loading.set(true);
    this.request = this.gemini.generate(prompt).subscribe({
      next: (text) => {
        const summary = { text, at: new Date() };
        cache.set(key, summary);
        this.show(summary);
      },
      error: (error) => {
        this.error.set(geminiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  private show(summary: Summary): void {
    this.summary.set(summary);
    this.error.set('');
    this.loading.set(false);
  }
}

