import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { isNumeric, SensorDataService } from '../../sensor-data.service';
import { DashboardConfigService } from '../dashboard-config.service';
import { ColorMode, DashboardTileConfig, Threshold, TileDisplay, TileSize, tileDisplay } from '../dashboard.models';

const MAX_FIELDS = 3;

// Add a tile (/dashboard/create) or edit one (/dashboard/tile/:id/edit).
@Component({
  imports: [RouterLink],
  selector: 'app-dashboard-create',
  styleUrl: './dashboard-create.css',
  templateUrl: './dashboard-create.html',
})
export class DashboardCreate {
  private readonly configService = inject(DashboardConfigService);
  private readonly sensorData = inject(SensorDataService);
  private readonly router = inject(Router);
  // Set when editing; the tile it points at may have been deleted.
  private readonly editId = inject(ActivatedRoute).snapshot.paramMap.get('id');
  protected readonly existing = this.editId ? this.configService.tile(this.editId) : undefined;
  protected readonly notFound = !!this.editId && !this.existing;

  // Every sensorType + DataKey pair found for the selected account.
  protected readonly availableFields = this.sensorData.options;
  protected readonly sizes: TileSize[] = ['1x1', '1x2', '1x3'];
  protected readonly displays: { value: TileDisplay; label: string; description: string }[] = [
    { value: 'values', label: 'Latest values', description: 'newest reading, big number' },
    { value: 'line', label: 'Line chart', description: 'numbers over time' },
    { value: 'bar', label: 'Bar chart', description: 'how often each value appears' },
    { value: 'pie', label: 'Pie chart', description: 'share of each value' },
    { value: 'stats', label: 'Stats', description: 'min / max / average / std dev' },
    { value: 'ai', label: 'AI summary', description: 'Gemini describes what the data shows' },
  ];
  protected readonly colorModes: { value: ColorMode; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'stdDev', label: 'Standard deviation' },
    { value: 'thresholds', label: 'Min / max' },
  ];
  protected readonly maxFields = MAX_FIELDS;
  protected readonly size = signal<TileSize>(this.existing?.size ?? '1x1');
  protected readonly selected = signal<string[]>(this.existing?.fields ?? []);
  protected readonly display = signal<TileDisplay>(this.existing ? tileDisplay(this.existing) : 'values');
  protected readonly colorMode = signal<ColorMode>(this.existing?.colorMode ?? 'none');
  protected readonly showTrend = signal(this.existing?.showTrend ?? false);
  protected readonly thresholds = signal<Record<string, Threshold>>(this.existing?.thresholds ?? {});

  // Selected entries with any non-number reading: a line chart shows these as a bar chart.
  protected readonly textEntries = computed(() =>
    this.selected()
      .filter((key) => this.sensorData.series().get(key)?.points.some((p) => !isNumeric(p.value)))
      .map((key) => this.sensorData.label(key)),
  );

  protected label(key: string): string {
    return this.sensorData.label(key);
  }

  protected toggleField(key: string, checked: boolean): void {
    this.selected.update((keys) => (checked ? [...keys, key] : keys.filter((k) => k !== key)));
  }

  protected setLimit(key: string, limit: 'min' | 'max', value: string): void {
    this.thresholds.update((all) => {
      const next = { ...all[key] };
      if (value.trim() === '' || !Number.isFinite(Number(value))) {
        delete next[limit];
      } else {
        next[limit] = Number(value);
      }
      return { ...all, [key]: next };
    });
  }

  protected save(): void {
    const tile: DashboardTileConfig = {
      id: this.existing?.id ?? `tile-${Date.now()}`,
      size: this.size(),
      fields: this.selected(),
      display: this.display(),
    };
    if (this.display() === 'values') {
      tile.colorMode = this.colorMode();
      tile.showTrend = this.showTrend();
      if (this.colorMode() === 'thresholds') {
        // Only keep limits for the entries that are actually on the tile.
        tile.thresholds = Object.fromEntries(this.selected().map((key) => [key, this.thresholds()[key] ?? {}]));
      }
    }
    if (this.existing) {
      this.configService.updateTile(tile);
    } else {
      this.configService.addTile(tile);
    }
    this.router.navigateByUrl('/dashboard');
  }
}
