import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SensorDataService } from '../../sensor-data.service';
import { DashboardConfigService } from '../dashboard-config.service';
import { TileSize } from '../dashboard.models';

const MAX_FIELDS = 3;

@Component({
  imports: [RouterLink],
  selector: 'app-dashboard-create',
  styleUrl: './dashboard-create.css',
  templateUrl: './dashboard-create.html',
})
export class DashboardCreate {
  private readonly configService = inject(DashboardConfigService);
  private readonly router = inject(Router);

  // Every sensorType + DataKey pair found for the account.
  protected readonly availableFields = inject(SensorDataService).options;
  protected readonly sizes: TileSize[] = ['1x1', '1x2', '1x3'];
  protected readonly maxFields = MAX_FIELDS;
  protected readonly size = signal<TileSize>('1x1');
  protected readonly selected = signal<string[]>([]);
  protected readonly showGraph = signal(false);

  protected toggleField(key: string, checked: boolean): void {
    this.selected.update((keys) => (checked ? [...keys, key] : keys.filter((k) => k !== key)));
  }

  protected create(): void {
    this.configService.addTile({
      id: `tile-${Date.now()}`,
      size: this.size(),
      fields: this.selected(),
      showGraph: this.size() === '1x3' && this.showGraph(),
    });
    this.router.navigateByUrl('/dashboard');
  }
}
