import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AlertInfo } from './alerts.catalog';

// Sends alert emails through the API's email endpoint (proxied like /Pioneer: src/proxy.conf.json,
// nginx.conf). Used by the Admin Triggers page when an alert (not a reminder) is triggered.
export const ALERT_EMAIL_TO = '7808steven@gmail.com';
const EMAIL_URL = '/Pioneer/email';

export interface AlertEmail {
  to: string;
  subject: string;
  text: string; // HTML
}

@Injectable({ providedIn: 'root' })
export class AlertEmailService {
  private readonly http = inject(HttpClient);

  sendAlert(info: AlertInfo, time: Date): Observable<unknown> {
    // The response body isn't used, so accept any (or none) rather than requiring JSON.
    return this.http.post(EMAIL_URL, buildAlertEmail(info, time, location.origin), { responseType: 'text' });
  }
}

// The email for one alert: a red "ALERT" banner, what happened, when, and what can be done, with a
// link to the Overview. Inline styles and a table layout, since email clients ignore <style> blocks.
export function buildAlertEmail(info: AlertInfo, time: Date, appOrigin: string): AlertEmail {
  const when = time.toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  const options = info.buttons
    .filter((b) => b.style !== 'unavailable')
    .map((b) => `<li style="margin:0 0 4px">${escapeHtml(b.label)}</li>`)
    .join('');
  const overviewUrl = `${appOrigin}/overview`;
  // Some alerts are just titled "ALERT" (e.g. Smoke alarm); use their name instead.
  const headline = /^alert$/i.test(info.title.trim()) ? info.name : info.title;

  const text = `<!doctype html>
<html>
<body style="margin:0;padding:24px;background:#f4f6f8;font-family:Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#16232b">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #dde3e8">
    <tr>
      <td style="background:#d93a3f;color:#ffffff;padding:14px 20px;font-weight:800;letter-spacing:1px;font-size:14px">
        ALERT &middot; ${escapeHtml(info.name)}
      </td>
    </tr>
    <tr>
      <td style="padding:20px">
        <h1 style="margin:0 0 8px;font-size:20px">${escapeHtml(headline)}</h1>
        <p style="margin:0 0 12px;line-height:1.5">${escapeHtml(info.message)}</p>
        <p style="margin:0 0 16px;color:#5d6e78;font-size:14px">Triggered ${escapeHtml(when)}</p>
        ${options ? `<p style="margin:0 0 6px;font-weight:700">What you can do</p><ul style="margin:0 0 16px;padding-left:20px">${options}</ul>` : ''}
        <a href="${escapeHtml(overviewUrl)}" style="display:inline-block;background:#0e7490;color:#ffffff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">Open the Overview</a>
      </td>
    </tr>
    <tr>
      <td style="padding:12px 20px;border-top:1px solid #dde3e8;color:#5d6e78;font-size:12px">
        Sent by Progressive Pulse because this alert was triggered.
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { to: ALERT_EMAIL_TO, subject: `Progressive Pulse alert: ${headline}`, text };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
