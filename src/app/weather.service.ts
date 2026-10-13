import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface WeatherForecast {
  latitude: number;
  longitude: number;
  timezone: string;
  current_units: {
    temperature_2m: string;
    relative_humidity_2m: string;
    wind_speed_10m: string;
  };
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    wind_speed_10m: number;
  };
  hourly_units: {
    temperature_2m: string;
    precipitation_probability: string;
  };
  hourly: {
    time: string[];
    temperature_2m: number[];
    precipitation_probability: number[];
  };
}

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly http = inject(HttpClient);

  getForecast(latitude: number, longitude: number): Observable<WeatherForecast> {
    return this.http.get<WeatherForecast>('https://api.open-meteo.com/v1/forecast', {
      params: {
        latitude,
        longitude,
        current: 'temperature_2m,relative_humidity_2m,wind_speed_10m',
        hourly: 'temperature_2m,precipitation_probability',
        forecast_days: 1,
        timezone: 'auto',
      },
    });
  }
}
