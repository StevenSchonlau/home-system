import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the application header', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('header')?.textContent).toContain('Progressive Pulse');
  });

  it('shows the logo next to the brand name, linking to the overview', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const brand = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>('header a.brand')!;
    expect(brand.getAttribute('href')).toBe('/overview');
    expect(brand.querySelector('svg.brand-logo')?.getAttribute('aria-hidden')).toBe('true');
    expect(brand.textContent?.trim()).toBe('Progressive Pulse');
  });
});
