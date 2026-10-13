import { Routes } from '@angular/router';
import { Weather } from './weather/weather';
import { AirQuality } from './air-quality/air-quality';

export const routes: Routes = [
  { path: 'calendar', loadComponent: () => import('./calendar/calendar-page').then(m => m.CalendarPage) },
  { path: '', pathMatch: 'full', redirectTo: 'overview' },
  // Lazy-loaded: the page is large (mostly inline SVG illustrations).
  { path: 'overview', loadComponent: () => import('./overview/overview').then((m) => m.Overview) },
  { path: 'weather', component: Weather },
  { path: 'air-quality', component: AirQuality },
  {
    path: 'admin-triggers',
    loadComponent: () => import('./admin-triggers/admin-triggers').then((m) => m.AdminTriggers),
  },
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
    path: 'dashboard/tile/:id/edit',
    loadComponent: () => import('./dashboard/dashboard-create/dashboard-create').then((m) => m.DashboardCreate),
  },
  {
    path: 'dashboard/tile/:id',
    loadComponent: () => import('./dashboard/dashboard-graph/dashboard-graph').then((m) => m.DashboardGraph),
  }
];
