import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { WeatherForecast, WeatherService } from '../weather.service';

@Component({
  selector: 'app-weather',
  templateUrl: './weather.html',
  styleUrl: './weather.css',
})
export class Weather implements OnInit {
  private readonly weatherService = inject(WeatherService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly forecast = signal<WeatherForecast | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.loadForecast();
  }

  protected loadForecast(): void {
    if (this.loading()) {
      return;
    }

    this.error.set('');
    this.forecast.set(null);

    if (!navigator.geolocation) {
      this.error.set('Your browser does not support location access. Try a supported browser.');
      return;
    }

    this.loading.set(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (this.destroyRef.destroyed) {
          return;
        }
        this.weatherService
          .getForecast(coords.latitude, coords.longitude)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (forecast) => {
              this.forecast.set(forecast);
              this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
              this.error.set(
                error.status === 0
                  ? 'Could not reach the weather service. Check your connection and try again.'
                  : `The weather service returned an error (${error.status}). Please try again.`,
              );
              this.loading.set(false);
            },
          });
      },
      (error) => {
        if (this.destroyRef.destroyed) {
          return;
        }
        this.error.set(
          error.code === 1
            ? 'Location permission was denied. Allow location access in your browser and try again. Location access requires HTTPS or localhost.'
            : error.code === 3
              ? 'Finding your location timed out. Please try again.'
              : 'Your location is unavailable. Check your device location settings and try again.',
        );
        this.loading.set(false);
      },
      { timeout: 10000, maximumAge: 300000 },
    );
  }
}
