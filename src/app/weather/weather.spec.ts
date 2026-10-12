import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { WeatherForecast, WeatherService } from '../weather.service';
import { Weather } from './weather';

const forecast: WeatherForecast = {
  latitude: 40,
  longitude: -105,
  timezone: 'America/Denver',
  current_units: {
    temperature_2m: 'C',
    relative_humidity_2m: '%',
    wind_speed_10m: 'km/h',
  },
  current: {
    time: '2026-10-12T10:00',
    temperature_2m: 18,
    relative_humidity_2m: 45,
    wind_speed_10m: 12,
  },
  hourly_units: { temperature_2m: 'C', precipitation_probability: '%' },
  hourly: {
    time: ['2026-10-12T10:00', '2026-10-12T11:00'],
    temperature_2m: [18, 20],
    precipitation_probability: [10, 15],
  },
};

describe('Weather', () => {
  const getForecast = vi.fn();
  const getCurrentPosition = vi.fn();
  let originalGeolocation: PropertyDescriptor | undefined;

  beforeEach(() => {
    getForecast.mockReset().mockReturnValue(of(forecast));
    getCurrentPosition.mockReset().mockImplementation((success) =>
      success({ coords: { latitude: 40, longitude: -105 } }),
    );
    originalGeolocation = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });
    TestBed.configureTestingModule({
      imports: [Weather],
      providers: [{ provide: WeatherService, useValue: { getForecast } }],
    });
  });

  afterEach(() => {
    if (originalGeolocation) {
      Object.defineProperty(navigator, 'geolocation', originalGeolocation);
    } else {
      Reflect.deleteProperty(navigator, 'geolocation');
    }
  });

  function render() {
    const fixture = TestBed.createComponent(Weather);
    fixture.detectChanges();
    return fixture;
  }

  it('uses browser coordinates and displays current conditions and hourly rows', () => {
    const fixture = render();
    const page: HTMLElement = fixture.nativeElement;
    expect(getForecast).toHaveBeenCalledWith(40, -105);
    expect(page.textContent).toContain('America/Denver');
    expect(page.querySelector('dl')?.textContent).toContain('18 C');
    expect(page.querySelector('dl')?.textContent).toContain('45 %');
    expect(page.querySelector('dl')?.textContent).toContain('12 km/h');
    expect(page.querySelectorAll('tbody tr')).toHaveLength(2);
    expect(page.querySelectorAll('tbody tr')[1].textContent).toContain('20');
    expect(page.querySelectorAll('tbody tr')[1].textContent).toContain('15');
  });

  it('shows loading until the forecast arrives', () => {
    const response = new Subject<WeatherForecast>();
    getForecast.mockReturnValue(response);
    const fixture = render();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('[role="status"]')).not.toBeNull();
    expect(page.querySelector('button')?.disabled).toBe(true);
    response.next(forecast);
    fixture.detectChanges();
    expect(page.querySelector('[role="status"]')).toBeNull();
    expect(page.querySelector('button')?.disabled).toBe(false);
  });

  it('shows permission denial and allows a successful retry', () => {
    getCurrentPosition.mockImplementationOnce((_success, error) => error({ code: 1 }));
    const fixture = render();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('permission was denied');
    expect(getForecast).not.toHaveBeenCalled();
    page.querySelector('button')?.click();
    fixture.detectChanges();
    expect(page.querySelector('[role="alert"]')).toBeNull();
    expect(getForecast).toHaveBeenCalledWith(40, -105);
  });

  it.each([
    [2, 'location is unavailable'],
    [3, 'timed out'],
  ])('shows a location error for code %s', (code, message) => {
    getCurrentPosition.mockImplementationOnce((_success, error) => error({ code }));
    const page: HTMLElement = render().nativeElement;
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(message);
    expect(getForecast).not.toHaveBeenCalled();
  });

  it('shows an error when geolocation is unsupported', () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
    const page: HTMLElement = render().nativeElement;
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('does not support');
    expect(getForecast).not.toHaveBeenCalled();
  });

  it.each([
    [0, 'Check your connection'],
    [503, 'error (503)'],
  ])('shows a visible weather request error for status %s', (status, message) => {
    getForecast.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
    const page: HTMLElement = render().nativeElement;
    expect(page.querySelector('[role="alert"]')?.textContent).toContain(message);
    expect(page.querySelector('button')?.disabled).toBe(false);
  });

  it('does not request weather if location resolves after the page is destroyed', () => {
    getCurrentPosition.mockImplementation(() => {});
    const fixture = render();
    fixture.destroy();
    const success = getCurrentPosition.mock.calls[0][0];
    success({ coords: { latitude: 40, longitude: -105 } });
    expect(getForecast).not.toHaveBeenCalled();
  });
});
