import { Routes } from '@angular/router';
import { Weather } from './weather/weather';
import { AirQuality } from './air-quality/air-quality';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'weather' },
  { path: 'weather', component: Weather },
  { path: 'air-quality', component: AirQuality },
];
