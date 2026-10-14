import { Component } from '@angular/core';
import { HOME_SENSORS, MISSING_SENSOR, SensorIcon } from '../alerts-state/home-sensors.mock';

// SVG path data (24×24, stroked) for each sensor icon.
const ICONS: Record<SensorIcon, string> = {
  flame: 'M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 1 1 2 2 3 4 0-3-1-5 0-7z',
  thermometer: 'M10 4a2 2 0 0 1 4 0v10a4 4 0 1 1-4 0zM12 9v7',
  alarm: 'M12 3a7 7 0 0 1 7 7v4l2 3H3l2-3v-4a7 7 0 0 1 7-7zM10 20a2 2 0 0 0 4 0',
  droplet: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  snowflake: 'M12 2v20M4 6.5l16 11M20 6.5l-16 11M9 4l3 2 3-2M9 20l3-2 3 2',
  garage: 'M3 10l9-6 9 6v10H3zM7 20v-7h10v7M7 16h10',
};

// "Sensors overview" on the Overview page: mock home sensors plus a missing-sensor suggestion.
@Component({
  selector: 'app-sensors-overview',
  template: `
    <section class="card" aria-labelledby="sensors-title">
      <div class="head">
        <h2 id="sensors-title">Sensors overview</h2>
        <span class="summary">{{ okCount }} of {{ sensors.length }} OK</span>
      </div>
      <ul>
        @for (sensor of sensors; track sensor.name) {
          <li>
            <span class="icon" [class.check]="sensor.status === 'check'" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path [attr.d]="icons[sensor.icon]" /></svg>
            </span>
            <span class="what">
              <span class="name">{{ sensor.name }} <span class="where">· {{ sensor.location }}</span></span>
              <span class="detail">{{ sensor.detail }}</span>
            </span>
            <span class="reading">
              {{ sensor.reading }}
              <span class="status" [class.check]="sensor.status === 'check'">
                {{ sensor.status === 'ok' ? 'OK' : 'Check' }}
              </span>
            </span>
          </li>
        }
      </ul>
      <div class="missing">
        <span class="plus" aria-hidden="true">+</span>
        <p>
          <strong>No {{ missing.name.toLowerCase() }} connected.</strong>
          Connect one and you could save <strong>\${{ missing.yearlySavings }}/year</strong> on home insurance;
          it {{ missing.reason }}.
        </p>
      </div>
    </section>
  `,
  styles: `
    :host { display: block; }
    .card { background: var(--card); border-radius: 12px; padding: 16px; box-shadow: var(--card-shadow); }
    .head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
    h2 { margin: 0; font-size: 18px; }
    .summary { font-size: 13px; color: var(--ink-3); }
    ul { list-style: none; margin: 0; padding: 0; }
    li {
      display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 10px;
      padding: 9px 0; border-bottom: 1px solid var(--line);
    }
    li:last-child { border-bottom: none; }
    .icon {
      display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px;
      background: var(--reminder-light); color: var(--reminder);
    }
    .icon.check { background: var(--grade-d); color: var(--grade-d-ink); }
    .icon svg {
      width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2;
      stroke-linecap: round; stroke-linejoin: round;
    }
    .what { display: grid; min-width: 0; }
    .name { font-weight: 600; font-size: 14px; }
    .where { font-weight: 400; color: var(--ink-3); }
    .detail { font-size: 12px; color: var(--ink-3); }
    .reading { display: grid; justify-items: end; gap: 2px; font-weight: 700; font-size: 14px; white-space: nowrap; }
    .status {
      padding: 1px 7px; border-radius: 999px; font-size: 11px; font-weight: 700; letter-spacing: 0.5px;
      background: var(--grade-a); color: var(--grade-a-ink);
    }
    .status.check { background: var(--grade-d); color: var(--grade-d-ink); }
    .missing {
      display: flex; gap: 10px; align-items: flex-start; margin-top: 12px; padding: 10px 12px;
      border: 1px dashed var(--reminder); border-radius: 10px; background: var(--reminder-light);
    }
    .missing p { margin: 0; font-size: 13px; line-height: 1.45; }
    .plus {
      flex: none; display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%;
      background: var(--reminder); color: white; font-weight: 800; line-height: 1;
    }
  `,
})
export class SensorsOverview {
  protected readonly sensors = HOME_SENSORS;
  protected readonly missing = MISSING_SENSOR;
  protected readonly icons = ICONS;
  protected readonly okCount = HOME_SENSORS.filter((s) => s.status === 'ok').length;
}
