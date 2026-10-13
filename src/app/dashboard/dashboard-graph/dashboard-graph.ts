import { Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { SensorDataService } from '../../sensor-data.service';
import { DashboardConfigService } from '../dashboard-config.service';
import { SensorChart } from '../tile-content/sensor-chart';

// Full-page graph of one tile's 1-3 sensor series over time.
@Component({
  imports: [RouterLink, SensorChart],
  selector: 'app-dashboard-graph',
  styleUrl: './dashboard-graph.css',
  templateUrl: './dashboard-graph.html',
})
export class DashboardGraph {
  private readonly configService = inject(DashboardConfigService);
  private readonly sensorData = inject(SensorDataService);
  private readonly tileId = inject(ActivatedRoute).snapshot.paramMap.get('id');

  protected readonly tile = computed(() =>
    this.configService.config().tiles.find((tile) => tile.id === this.tileId),
  );
  protected readonly title = computed(
    () => this.tile()?.fields.map((key) => this.sensorData.label(key)).join(', ') ?? '',
  );
}
