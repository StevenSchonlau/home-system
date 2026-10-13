import { Routes } from '@angular/router';
import { Weather } from './weather/weather';
import { AirQuality } from './air-quality/air-quality';

export const routes: Routes = [
  { path: 'calendar', loadComponent: () => import('./calendar/calendar-page').then(m => m.CalendarPage) },
  { path: '', pathMatch: 'full', redirectTo: 'weather' },
  { path: 'weather', component: Weather },
  { path: 'air-quality', component: AirQuality },
  // Lazy-loaded so Chart.js stays out of the initial bundle.
  {
    path: 'dashboard',
    loadComponent: () => import('./dashboard/dashboard-home/dashboard-home').then((m) => m.DashboardHome),
  },
  {
    path: 'dashboard/create',
    loadComponent: () => import('./dashboard/dashboard-create/dashboard-create').then((m) => m.DashboardCreate),
  },
  {
    path: 'dashboard/tile/:id',
    loadComponent: () => import('./dashboard/dashboard-graph/dashboard-graph').then((m) => m.DashboardGraph),
  }
];
