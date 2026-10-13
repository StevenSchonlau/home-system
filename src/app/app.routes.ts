import { Routes } from '@angular/router';
import { Weather } from './weather/weather';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'weather' },
  { path: 'weather', component: Weather },
];
