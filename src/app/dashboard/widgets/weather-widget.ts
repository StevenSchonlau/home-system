import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { WeatherForecast, WeatherService } from '../../weather.service';
import { currentLocation } from './current-location';

// Current weather at your location; the whole card links to the Weather page.
@Component({
  selector: 'app-weather-widget',
  imports: [RouterLink],
  template: `
    <a class="widget" routerLink="/weather">
      <span class="title">Weather</span>
      @if (forecast(); as weather) {
        <span class="value">{{ weather.current.temperature_2m }} {{ weather.current_units.temperature_2m }}</span>
        <span class="detail">
          Humidity {{ weather.current.relative_humidity_2m }}{{ weather.current_units.relative_humidity_2m }}
          · Wind {{ weather.current.wind_speed_10m }} {{ weather.current_units.wind_speed_10m }}
        </span>
      } @else {
        <span class="status">{{ status() }}</span>
      }
      <span class="link">View weather →</span>
    </a>
  `,
  styleUrl: './widget.css',
})
export class WeatherWidget {
  private readonly weatherService = inject(WeatherService);
  protected readonly forecast = signal<WeatherForecast | null>(null);
  protected readonly status = signal('Loading…');

  constructor() {
    const destroyRef = inject(DestroyRef);
    currentLocation().then(
      ({ latitude, longitude }) => {
        if (destroyRef.destroyed) {
          return;
        }
        this.weatherService
          .getForecast(latitude, longitude)
          .pipe(takeUntilDestroyed(destroyRef))
          .subscribe({
            next: (forecast) => this.forecast.set(forecast),
            error: () => this.status.set('Weather unavailable'),
          });
      },
      (message: string) => this.status.set(message),
    );
  }
}
