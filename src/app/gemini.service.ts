import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { from, map, Observable, retry, switchMap, throwError, timer } from 'rxjs';
import { loadEnv } from './env';

const DEFAULT_MODEL = 'gemini-3.5-flash-lite';
const PLACEHOLDER_KEY = 'your-gemini-api-key-here';

// Gemini generateContent response (only the parts we read).
interface GenerateContentResponse {
  candidates?: { content?: { parts?: { text?: string }[] } }[];
  promptFeedback?: { blockReason?: string };
}

// Sends a prompt straight to the Gemini API (it allows browser requests, so no proxy is needed).
// The key and model come from .env: GEMINI_API_KEY and GEMINI_MODEL (default gemini-3.5-flash-lite).
// Without a .env (or key), AI features show a message instead of failing.
@Injectable({ providedIn: 'root' })
export class GeminiService {
  private readonly http = inject(HttpClient);

  generate(prompt: string): Observable<string> {
    return from(loadEnv()).pipe(switchMap((env) => this.send(prompt, env)));
  }

  private send(prompt: string, env: Record<string, string>): Observable<string> {
    const apiKey = env['GEMINI_API_KEY'];
    if (!apiKey || apiKey === PLACEHOLDER_KEY) {
      return throwError(() => new Error('Add your Gemini API key to .env as GEMINI_API_KEY, then reload.'));
    }
    const model = env['GEMINI_MODEL'] || DEFAULT_MODEL;
    return this.http
      .post<GenerateContentResponse>(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
        { contents: [{ role: 'user', parts: [{ text: prompt }] }] },
        { headers: { 'x-goog-api-key': apiKey } },
      )
      .pipe(
        // Gemini sometimes answers 503 "overloaded"; one retry after a short pause usually works.
        retry({
          count: 1,
          delay: (error) => (isBusy(error) ? timer(2000) : throwError(() => error)),
        }),
        map((response) => {
          const text = response.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim();
          if (!text) {
            throw new Error(
              response.promptFeedback?.blockReason
                ? `Gemini declined to answer (${response.promptFeedback.blockReason}).`
                : 'Gemini returned an empty answer.',
            );
          }
          return text;
        }),
      );
  }
}

// A short message to show for a failed request.
export function geminiErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return error instanceof Error ? error.message : 'Something went wrong asking Gemini.';
  }
  const detail = JSON.stringify(error.error ?? '');
  if (error.status === 0) {
    return 'Could not reach Gemini. Check your connection.';
  }
  if (error.status === 401 || error.status === 403 || detail.includes('API_KEY_INVALID')) {
    return 'Gemini rejected the API key. Check GEMINI_API_KEY in .env.';
  }
  if (error.status === 404) {
    return 'Gemini model not found. Check GEMINI_MODEL in .env.';
  }
  if (error.status === 429) {
    return 'Gemini rate limit reached. Try again in a minute.';
  }
  if (isBusy(error)) {
    return 'Gemini is busy right now. Try again shortly.';
  }
  return `Gemini returned an error (${error.status}).`;
}

function isBusy(error: unknown): boolean {
  return error instanceof HttpErrorResponse && error.status === 503;
}
