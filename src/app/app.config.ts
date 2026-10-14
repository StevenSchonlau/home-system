import {
  ApplicationConfig,
  inject,
  provideBrowserGlobalErrorListeners,
  provideEnvironmentInitializer,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { CalendarRemindersService } from './alerts-state/calendar-reminders.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(),
    provideRouter(routes),
    // Start fetching today's calendar reminders into the Overview queue when the app starts.
    provideEnvironmentInitializer(() => {
      inject(CalendarRemindersService);
    }),
  ]
};
