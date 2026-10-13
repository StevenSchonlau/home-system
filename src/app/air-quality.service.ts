import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface AirQualityData {
  latitude: number;
  longitude: number;
  timezone: string;
  current_units: {
    us_aqi: string;
    pm2_5: string;
    pm10: string;
  };
  current: {
    time: string;
    us_aqi: number | null;
    pm2_5: number | null;
    pm10: number | null;
  };
}

@Injectable({ providedIn: 'root' })
export class AirQualityService {
  private readonly http = inject(HttpClient);

  getAirQuality(latitude: number, longitude: number): Observable<AirQualityData> {
    return this.http.get<AirQualityData>('https://air-quality-api.open-meteo.com/v1/air-quality', {
      params: {
        latitude,
        longitude,
        current: 'us_aqi,pm2_5,pm10',
        timezone: 'auto',
      },
    });
  }
}
