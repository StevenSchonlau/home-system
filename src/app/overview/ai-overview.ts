import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, effect, inject, signal, untracked } from '@angular/core';
import { Subscription } from 'rxjs';
import { buildAlertsSummaryPrompt } from '../alerts-state/alerts-ai';
import { AlertsService } from '../alerts-state/alerts.service';
import { geminiErrorMessage, GeminiService } from '../gemini.service';

interface Summary {
  text: string;
  at: Date;
}

// Overviews by state (queue + unaddressed reminders), kept while the app is open so moving between
// pages doesn't ask Gemini again. ↻ always asks again.
const CACHE_MS = 10 * 60 * 1000;
const cache = new Map<string, Summary>();

// Gemini's overview of the Overview page: alerts, unaddressed reminders and their insurance impact.
// Asks when the page opens and whenever the queue or unaddressed reminders change.
@Component({
  selector: 'app-ai-overview',
  imports: [DatePipe],
  template: `
    <section class="card" aria-labelledby="ai-overview-title">
      <p class="title" id="ai-overview-title">AI overview</p>
      @if (loading()) {
        <p class="muted" role="status">Asking Gemini…</p>
      } @else if (error()) {
        <p class="error" role="alert">{{ error() }}</p>
      } @else if (summary(); as summary) {
        <p class="text">{{ summary.text }}</p>
      }
      <div class="footer">
        @if (summary(); as summary) {
          <span class="muted">Gemini · {{ summary.at | date: 'shortTime' }}</span>
        }
        <button type="button" class="refresh" (click)="refresh()" [disabled]="loading()" title="Ask Gemini again">
          ↻ Refresh
        </button>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; }
    .card {
      display: flex; flex-direction: column; gap: 0.5rem; padding: 16px 18px;
      border-left: 4px solid var(--accent); border-radius: 12px;
      background: var(--surface); box-shadow: var(--shadow);
    }
    p { margin: 0; }
    .title { font-size: 0.75rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
    .text { line-height: 1.55; white-space: pre-line; }
    .muted { color: var(--text-muted); font-size: 0.9rem; }
    .error { color: var(--danger); font-size: 0.9rem; }
    .footer { display: flex; align-items: center; gap: 0.5rem; }
    /* Explicit padding/margin: the Overview page has a general button rule that would apply here. */
    .refresh {
      margin: 0 0 0 auto; padding: 0.25rem 0.7rem; border: 1px solid var(--border); border-radius: 999px;
      background: var(--surface); color: var(--text); font: inherit; font-size: 0.8rem; cursor: pointer;
    }
    .refresh:hover { background: var(--surface-hover); }
    .refresh:disabled { opacity: 0.5; cursor: wait; }
  `,
})
export class AiOverview {
  private readonly alerts = inject(AlertsService);
  private readonly gemini = inject(GeminiService);

  protected readonly summary = signal<Summary | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  // Changes only when the queue or unaddressed reminders change (not with the clock).
  private readonly stateKey = computed(() =>
    JSON.stringify([this.alerts.sortedQueue().map((e) => e.id), this.alerts.openIssues().map((i) => i.name)]),
  );
  private request?: Subscription;

  constructor() {
    effect(() => {
      const key = this.stateKey();
      untracked(() => this.load(key, false));
    });
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  protected refresh(): void {
    this.load(this.stateKey(), true);
  }

  private load(key: string, force: boolean): void {
    const cached = cache.get(key);
    if (!force && cached && Date.now() - cached.at.getTime() < CACHE_MS) {
      this.show(cached);
      return;
    }
    this.request?.unsubscribe();
    this.summary.set(null);
    this.error.set('');
    this.loading.set(true);
    const prompt = buildAlertsSummaryPrompt({
      queue: this.alerts.sortedQueue(),
      openIssues: this.alerts.openIssues(),
      now: new Date(),
    });
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
