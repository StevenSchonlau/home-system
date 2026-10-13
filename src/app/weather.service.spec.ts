import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { WeatherService } from './weather.service';

describe('WeatherService', () => {
  let http: HttpTestingController;
  let service: WeatherService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(WeatherService);
  });

  afterEach(() => http.verify());

  it('requests the forecast for the supplied coordinates and returns the response', () => {
    const response = { latitude: 40, longitude: -105 };
    const next = vi.fn();
    service.getForecast(40, -105).subscribe(next);

    const request = http.expectOne(
      (req) => req.url === 'https://api.open-meteo.com/v1/forecast',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('latitude')).toBe('40');
    expect(request.request.params.get('longitude')).toBe('-105');
    expect(request.request.params.get('current')).toBe(
      'temperature_2m,relative_humidity_2m,wind_speed_10m',
    );
    expect(request.request.params.get('hourly')).toBe(
      'temperature_2m,precipitation_probability',
    );
    expect(request.request.params.get('forecast_days')).toBe('1');
    expect(request.request.params.get('timezone')).toBe('auto');
    request.flush(response);
    expect(next).toHaveBeenCalledWith(response);
  });

  it('propagates HTTP failures to the caller', () => {
    const error = vi.fn();
    service.getForecast(40, -105).subscribe({ error });
    http.expectOne((req) => req.url.endsWith('/forecast')).flush('Unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
    });
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ status: 503 }));
  });
});
