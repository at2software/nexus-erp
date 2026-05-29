import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { UptimeMonitor } from '@models/uptime/uptime-monitor.model';
import { UptimeMonitorService } from '@models/uptime/uptime-monitor.service';
import { WidgetsModule } from '../widgets.module';
import { EChartsRangeAreaOptions } from '@charts/echarts-presets';
import moment from 'moment';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-uptime-monitors',
    templateUrl: './widget-uptime-monitors.component.html',
    styleUrls: ['./widget-uptime-monitors.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule],
})
export class WidgetUptimeMonitorsComponent extends BaseWidgetComponent {
    monitors = signal<UptimeMonitor[]>([]);
    chartOptions = signal<any>({});
    #service = inject(UptimeMonitorService);

    reload() {
        this.#service.index().subscribe({
            next: (monitors) => {
                this.monitors.set(monitors);
                this.#calculateStats();
            },
            error: (err) => console.error('Failed to load monitors:', err),
        });
    }

    #calculateStats() {
        const monitors = this.monitors();
        const upCount = monitors.filter((m) => m.last_status === 'up').length;
        this.value.set(Math.round((upCount / (monitors.length || 1)) * 100));
        this.#initChartOptions();
    }

    #initChartOptions() {
        const now = moment();
        const last30Days = Array.from({ length: 30 }, (_, i) => ({
            date: now.clone().subtract(29 - i, 'days').format('YYYY-MM-DD'),
            upCount: 0,
            total: 0,
        }));

        this.monitors().forEach((monitor) => {
            last30Days.forEach((day) => {
                day.total++;
                if (monitor.last_status === 'up') day.upCount++;
            });
        });

        this.chartOptions.set({
            ...EChartsRangeAreaOptions,
            chart: { height: 120 },
            series: [{
                type: 'line',
                data: last30Days.map((day) => [day.date, day.total > 0 ? Math.round((day.upCount / day.total) * 100) : 100]),
                smooth: true,
                symbol: 'none',
                lineStyle: { width: 2, color: '#28a745' },
                areaStyle: { color: { type: 'linear', x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: 'rgba(40, 167, 69, 0.3)' }, { offset: 1, color: 'rgba(40, 167, 69, 0.05)' }] } },
            }],
        });
    }
}
