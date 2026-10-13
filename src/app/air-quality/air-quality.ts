import { HttpErrorResponse } from '@angular/common/http';
import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AirQualityData, AirQualityService } from '../air-quality.service';

@Component({
  selector: 'app-air-quality',
  templateUrl: './air-quality.html',
  styleUrl: './air-quality.css',
})
export class AirQuality implements OnInit {
  private readonly airQualityService = inject(AirQualityService);
  private readonly destroyRef = inject(DestroyRef);
  protected readonly airQuality = signal<AirQualityData | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal('');

  ngOnInit(): void {
    this.loadAirQuality();
  }

  protected loadAirQuality(): void {
    if (this.loading()) {
      return;
    }

    this.error.set('');
    this.airQuality.set(null);

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
        this.airQualityService
          .getAirQuality(coords.latitude, coords.longitude)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (airQuality) => {
              this.airQuality.set(airQuality);
              this.loading.set(false);
            },
            error: (error: HttpErrorResponse) => {
              this.error.set(
                error.status === 0
                  ? 'Could not reach the air quality service. Check your connection and try again.'
                  : `The air quality service returned an error (${error.status}). Please try again.`,
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
