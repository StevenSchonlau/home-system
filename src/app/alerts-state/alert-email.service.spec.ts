import { ALERT_EMAIL_TO, buildAlertEmail } from './alert-email.service';
import { ALERTS } from './alerts.catalog';

describe('buildAlertEmail', () => {
  const smoke = ALERTS.find((a) => a.name === 'Smoke alarm')!;

  it('addresses an HTML email about the alert', () => {
    const email = buildAlertEmail(smoke, new Date(2026, 9, 15, 9, 5), 'http://localhost:4200');
    expect(email.to).toBe(ALERT_EMAIL_TO);
    // The smoke alarm's title is just "ALERT", so its name is used instead.
    expect(email.subject).toBe('Progressive Pulse alert: Smoke alarm');
    expect(email.text).toContain('<h1 style="margin:0 0 8px;font-size:20px">Smoke alarm</h1>');
    expect(email.text).toContain(smoke.message);
    expect(email.text).toContain('href="http://localhost:4200/overview"');
    expect(email.text).toContain('Call Emergency Services');
  });

  it('leaves out options that are unavailable and escapes HTML in the text', () => {
    const water = ALERTS.find((a) => a.name === 'Water level')!;
    const email = buildAlertEmail(
      { ...water, title: 'Pump <failed> & "flooding"' },
      new Date(),
      'http://localhost:4200',
    );
    expect(email.text).not.toContain('View Security Feed'); // "unavailable" for this alert
    expect(email.text).toContain('Pump &lt;failed&gt; &amp; &quot;flooding&quot;');
    expect(email.subject).toBe('Progressive Pulse alert: Pump <failed> & "flooding"');
  });
});
