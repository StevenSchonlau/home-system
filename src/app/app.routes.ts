import { Routes } from '@angular/router';
import { Weather } from './weather/weather';
import { DashboardHome } from './dashboard/dashboard-home/dashboard-home';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'weather' },
  { path: 'weather', component: Weather },
  { path: 'dashboard', component: DashboardHome }
];
