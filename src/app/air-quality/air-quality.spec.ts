import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { AirQualityData, AirQualityService } from '../air-quality.service';
import { AirQuality } from './air-quality';

const quality: AirQualityData = {
  latitude: 40,
  longitude: -105,
  timezone: 'America/Denver',
  current_units: { us_aqi: 'USAQI', pm2_5: 'μg/m³', pm10: 'μg/m³' },
  current: { time: '2026-10-12T10:00', us_aqi: 42, pm2_5: 8.2, pm10: 12.5 },
};

describe('AirQuality', () => {
  const getAirQuality = vi.fn();
  const getCurrentPosition = vi.fn();
  let originalGeolocation: PropertyDescriptor | undefined;

  beforeEach(() => {
    getAirQuality.mockReset().mockReturnValue(of(quality));
    getCurrentPosition.mockReset().mockImplementation((success) =>
      success({ coords: { latitude: 40, longitude: -105 } }),
    );
    originalGeolocation = Object.getOwnPropertyDescriptor(navigator, 'geolocation');
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition },
    });
    TestBed.configureTestingModule({
      imports: [AirQuality],
      providers: [{ provide: AirQualityService, useValue: { getAirQuality } }],
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
    const fixture = TestBed.createComponent(AirQuality);
    fixture.detectChanges();
    return fixture;
  }

  it('uses browser coordinates and displays all three metrics with units and local time', () => {
    const page: HTMLElement = render().nativeElement;
    expect(getAirQuality).toHaveBeenCalledWith(40, -105);
    expect(page.textContent).toContain('America/Denver');
    expect(page.textContent).toContain('2026-10-12 10:00');
    const metrics = page.querySelectorAll('dd');
    expect(metrics[0].textContent).toContain('42');
    expect(metrics[1].textContent).toContain('8.2');
    expect(metrics[1].textContent).toContain('μg/m³');
    expect(metrics[2].textContent).toContain('12.5');
    expect(metrics[2].textContent).toContain('μg/m³');
  });

  it('displays missing values as unavailable and preserves zero values', () => {
    getAirQuality.mockReturnValue(of({ ...quality, current: {
      ...quality.current, us_aqi: 0, pm2_5: null, pm10: null,
    } }));
    const metrics = (render().nativeElement as HTMLElement).querySelectorAll('dd');
    expect(metrics[0].textContent?.trim()).toBe('0');
    expect(metrics[1].textContent?.trim()).toBe('Unavailable');
    expect(metrics[2].textContent?.trim()).toBe('Unavailable');
  });

  it('shows loading until the response arrives and disables refresh', () => {
    const response = new Subject<AirQualityData>();
    getAirQuality.mockReturnValue(response);
    const fixture = render();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('[role="status"]')).not.toBeNull();
    expect(page.querySelector('button')?.disabled).toBe(true);
    response.next(quality);
    fixture.detectChanges();
    expect(page.querySelector('[role="status"]')).toBeNull();
    expect(page.querySelector('button')?.disabled).toBe(false);
  });

  it('allows a retry after location permission is denied', () => {
    getCurrentPosition.mockImplementationOnce((_success, error) => error({ code: 1 }));
    const fixture = render();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('permission was denied');
    expect(getAirQuality).not.toHaveBeenCalled();
    page.querySelector('button')?.click();
    fixture.detectChanges();
    expect(page.querySelector('[role="alert"]')).toBeNull();
    expect(getAirQuality).toHaveBeenCalledWith(40, -105);
  });

  it.each([[2, 'location is unavailable'], [3, 'timed out']])(
    'shows location error %s', (code, message) => {
      getCurrentPosition.mockImplementationOnce((_success, error) => error({ code }));
      const page: HTMLElement = render().nativeElement;
      expect(page.querySelector('[role="alert"]')?.textContent).toContain(message);
      expect(getAirQuality).not.toHaveBeenCalled();
    },
  );

  it('handles browsers without geolocation', () => {
    Object.defineProperty(navigator, 'geolocation', { configurable: true, value: undefined });
    const page: HTMLElement = render().nativeElement;
    expect(page.querySelector('[role="alert"]')?.textContent).toContain('does not support');
    expect(getAirQuality).not.toHaveBeenCalled();
  });

  it.each([[0, 'Check your connection'], [503, 'error (503)']])(
    'shows request error %s', (status, message) => {
      getAirQuality.mockReturnValue(throwError(() => new HttpErrorResponse({ status })));
      const page: HTMLElement = render().nativeElement;
      expect(page.querySelector('[role="alert"]')?.textContent).toContain(message);
      expect(page.querySelector('button')?.disabled).toBe(false);
    },
  );

  it('ignores location callbacks after destruction', () => {
    getCurrentPosition.mockImplementation(() => {});
    const fixture = render();
    fixture.destroy();
    getCurrentPosition.mock.calls[0][0]({ coords: { latitude: 40, longitude: -105 } });
    expect(getAirQuality).not.toHaveBeenCalled();
  });

  it('unsubscribes from an outstanding request on destruction', () => {
    const response = new Subject<AirQualityData>();
    getAirQuality.mockReturnValue(response);
    const fixture = render();
    expect(response.observed).toBe(true);
    fixture.destroy();
    expect(response.observed).toBe(false);
  });
});
