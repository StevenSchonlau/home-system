import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { AirQualityData, AirQualityService } from '../../air-quality.service';
import { currentLocation } from './current-location';

// U.S. AQI categories (upper bound of each band).
const AQI_LEVELS = [
  { max: 50, label: 'Good', color: '#2e9e5b' },
  { max: 100, label: 'Moderate', color: '#d4a20b' },
  { max: 150, label: 'Unhealthy for sensitive groups', color: '#e8812a' },
  { max: 200, label: 'Unhealthy', color: '#d93a3f' },
  { max: 300, label: 'Very unhealthy', color: '#8f3f97' },
  { max: Infinity, label: 'Hazardous', color: '#7e0023' },
];

// Current air quality at your location; the whole card links to the Air Quality page.
@Component({
  selector: 'app-air-quality-widget',
  imports: [RouterLink],
  template: `
    <a class="widget" routerLink="/air-quality">
      <span class="title">Air quality</span>
      @if (airQuality(); as quality) {
        <span class="value">
          {{ quality.current.us_aqi ?? '—' }}
          @if (level(); as level) {
            <span class="label" [style.color]="level.color">{{ level.label }}</span>
          }
        </span>
        <span class="detail">
          U.S. AQI · PM2.5 {{ quality.current.pm2_5 ?? '—' }} · PM10 {{ quality.current.pm10 ?? '—' }}
          {{ quality.current_units.pm2_5 }}
        </span>
      } @else {
        <span class="status">{{ status() }}</span>
      }
      <span class="link">View air quality →</span>
    </a>
  `,
  styleUrl: './widget.css',
})
export class AirQualityWidget {
  private readonly airQualityService = inject(AirQualityService);
  protected readonly airQuality = signal<AirQualityData | null>(null);
  protected readonly status = signal('Loading…');

  protected readonly level = computed(() => {
    const aqi = this.airQuality()?.current.us_aqi;
    return aqi === null || aqi === undefined ? null : AQI_LEVELS.find((l) => aqi <= l.max)!;
  });

  constructor() {
    const destroyRef = inject(DestroyRef);
    currentLocation().then(
      ({ latitude, longitude }) => {
        if (destroyRef.destroyed) {
          return;
        }
        this.airQualityService
          .getAirQuality(latitude, longitude)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (airQuality) => this.airQuality.set(airQuality),
            error: () => this.status.set('Air quality unavailable'),
          });
      },
      (message: string) => this.status.set(message),
    );
  }
}
