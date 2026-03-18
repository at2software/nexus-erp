import { Component, OnInit } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { UptimeMonitor } from '@models/uptime/uptime-monitor.model';
import { UptimeMonitorService } from '@models/uptime/uptime-monitor.service';
import { WidgetsModule } from '../widgets.module';
import { EChartsRangeAreaOptions } from '@charts/ChartOptions';
import moment from 'moment';

@Component({
    selector: 'widget-uptime-monitors',
    templateUrl: './widget-uptime-monitors.component.html',
    styleUrls: ['./widget-uptime-monitors.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule]
})
export class WidgetUptimeMonitorsComponent extends BaseWidgetComponent implements OnInit {
    monitors: UptimeMonitor[] = [];
    chartOptions: any = {};

    constructor(private service: UptimeMonitorService) {
        super();
    }

    ngOnInit() {
        super.ngOnInit();
        this.reload();
    }

    reload() {
        this.service.index().subscribe({
            next: (monitors) => {
                this.monitors = monitors;
                this.calculateStats();
            },
            error: (err) => console.error('Failed to load monitors:', err)
        });
    }

    calculateStats() {
        const upCount = this.monitors.filter(m => m.last_status === 'up').length;

        const total = this.monitors.length || 1;
        this.value = Math.round((upCount / total) * 100);

        this.initChartOptions();
    }

    initChartOptions() {
        const last30Days: any[] = [];
        const now = moment();

        for (let i = 29; i >= 0; i--) {
            const date = now.clone().subtract(i, 'days');
            last30Days.push({
                date: date.format('YYYY-MM-DD'),
                upCount: 0,
                total: 0
            });
        }

        this.monitors.forEach(monitor => {
            last30Days.forEach(day => {
                day.total++;
                if (monitor.last_status === 'up') {
                    day.upCount++;
                }
            });
        });

        const data = last30Days.map(day => {
            const percentage = day.total > 0 ? (day.upCount / day.total) * 100 : 100;
            return [day.date, Math.round(percentage)];
        });

        this.chartOptions = {
            ...EChartsRangeAreaOptions,
            series: [{
                type: 'line',
                data: data,
                smooth: true,
                symbol: 'none',
                lineStyle: {
                    width: 2,
                    color: '#28a745'
                },
                areaStyle: {
                    color: {
                        type: 'linear',
                        x: 0,
                        y: 0,
                        x2: 0,
                        y2: 1,
                        colorStops: [{
                            offset: 0,
                            color: 'rgba(40, 167, 69, 0.3)'
                        }, {
                            offset: 1,
                            color: 'rgba(40, 167, 69, 0.05)'
                        }]
                    }
                }
            }]
        };
    }
}
