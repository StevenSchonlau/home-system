import {
  afterNextRender,
  Component,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  untracked,
  ViewEncapsulation,
} from '@angular/core';
import { AskAi } from '../ai/ask-ai/ask-ai';
import { injectOverviewQuestion } from '../alerts-state/alerts-ai';
import { AlertsService } from '../alerts-state/alerts.service';
import { ThemeService } from '../theme.service';
import { AiOverview } from './ai-overview';
import { startOverview } from './overview.script';

type OverviewScript = ReturnType<typeof startOverview>;

// The landing page: insurance scores and the alerts/reminders queue (from demos/alert-demo.html).
// Events are added on the Admin Triggers page; the queue itself lives in AlertsService.
// Shadow DOM keeps the demo's styles to itself and lets them style the rows its script builds.
@Component({
  selector: 'app-overview',
  imports: [AskAi, AiOverview],
  templateUrl: './overview.html',
  styleUrl: './overview.css',
  encapsulation: ViewEncapsulation.ShadowDom,
  host: { '[class.dark]': "themeService.theme() === 'dark'" },
})
export class Overview {
  protected readonly themeService = inject(ThemeService);
  // What the page's buttons call; set once the page script has started.
  protected demo?: OverviewScript['actions'];
  // The "Ask AI" bar's data: queue, unaddressed reminders and insurance scores.
  protected readonly prepareQuestion = injectOverviewQuestion();

  constructor() {
    const host = inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    const alerts = inject(AlertsService);
    let running: OverviewScript | undefined;

    // The script looks up the page's elements, so start it once they're rendered.
    afterNextRender(() => {
      running = startOverview(host.shadowRoot!, alerts);
      this.demo = running.actions;
    });

    // Redraw whenever the shared state changes (e.g. a snooze firing while you're here).
    effect(() => {
      alerts.queue();
      alerts.openIssues();
      alerts.selectedId();
      untracked(() => running?.render());
    });

    // Leaving the page stops its timers (the queue stays in AlertsService).
    inject(DestroyRef).onDestroy(() => running?.stop());
  }
}
