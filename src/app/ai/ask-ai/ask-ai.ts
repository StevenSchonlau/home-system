import { Component, DestroyRef, inject, input, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { geminiErrorMessage, GeminiService } from '../../gemini.service';

// What a page hands back for a question: the prompt to send plus a short note of what it's based on
// (shown under the answer), or a message to show instead of asking Gemini.
export type AskPrepared = { prompt: string; basis: string } | { error: string };

// "Ask AI about …": a question bar; press Enter and Gemini's answer appears below it.
// The page decides what data goes with the question (`prepare`). One question at a time:
// asking again replaces the answer.
@Component({
  selector: 'app-ask-ai',
  templateUrl: './ask-ai.html',
  styleUrl: './ask-ai.css',
})
export class AskAi {
  private readonly gemini = inject(GeminiService);
  readonly prepare = input.required<(question: string) => AskPrepared>();
  readonly placeholder = input('Ask AI about your data and press Enter');

  protected readonly question = signal('');
  protected readonly answer = signal('');
  protected readonly error = signal('');
  protected readonly loading = signal(false);
  protected readonly basis = signal('');
  private request?: Subscription;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.request?.unsubscribe());
  }

  protected ask(event: Event, input: HTMLInputElement): void {
    event.preventDefault();
    const question = input.value.trim();
    if (!question || this.loading()) {
      return;
    }
    input.value = '';
    this.request?.unsubscribe();
    this.question.set(question);
    this.answer.set('');
    this.error.set('');

    const prepared = this.prepare()(question);
    if ('error' in prepared) {
      this.error.set(prepared.error);
      return;
    }
    this.basis.set(prepared.basis);
    this.loading.set(true);
    this.request = this.gemini.generate(prepared.prompt).subscribe({
      next: (answer) => {
        this.answer.set(answer);
        this.loading.set(false);
      },
      error: (error) => {
        this.error.set(geminiErrorMessage(error));
        this.loading.set(false);
      },
    });
  }

  protected clear(): void {
    this.request?.unsubscribe();
    this.question.set('');
    this.answer.set('');
    this.error.set('');
    this.loading.set(false);
  }
}
