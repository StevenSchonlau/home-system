import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AirQualityService } from './air-quality.service';

describe('AirQualityService', () => {
  let http: HttpTestingController;
  let service: AirQualityService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    service = TestBed.inject(AirQualityService);
  });

  afterEach(() => http.verify());

  it('requests current AQI and particulate concentrations for the supplied location', () => {
    const response = { current: { us_aqi: 42, pm2_5: 8.2, pm10: 12.5 } };
    const next = vi.fn();
    service.getAirQuality(40, -105).subscribe(next);
    const request = http.expectOne(
      (req) => req.url === 'https://air-quality-api.open-meteo.com/v1/air-quality',
    );
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('latitude')).toBe('40');
    expect(request.request.params.get('longitude')).toBe('-105');
    expect(request.request.params.get('current')).toBe('us_aqi,pm2_5,pm10');
    expect(request.request.params.get('timezone')).toBe('auto');
    request.flush(response);
    expect(next).toHaveBeenCalledWith(response);
  });

  it('propagates HTTP failures', () => {
    const error = vi.fn();
    service.getAirQuality(40, -105).subscribe({ error });
    http.expectOne((req) => req.url.endsWith('/air-quality')).flush('Unavailable', {
      status: 503,
      statusText: 'Service Unavailable',
    });
    expect(error).toHaveBeenCalledWith(expect.objectContaining({ status: 503 }));
  });
});
