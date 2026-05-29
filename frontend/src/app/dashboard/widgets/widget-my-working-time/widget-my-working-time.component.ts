import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { StatsService } from '@models/stats-service';
import { EChartsStackedBarOptions } from '@charts/echarts-presets';
import { GlobalService } from '@models/global.service';
import moment from 'moment';
import { Color } from '@constants/Color';
import { WidgetsModule } from '../widgets.module';
import { DecimalPipe } from '@angular/common';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-my-working-time',
    templateUrl: './widget-my-working-time.component.html',
    styleUrls: ['./widget-my-working-time.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, DecimalPipe],
})
export class WidgetMyWorkingTimeComponent extends BaseWidgetComponent {
    #stats = inject(StatsService);
    #global = inject(GlobalService);
    #echartsInstance: any;

    average = signal(0);
    averageSoll = signal(0);
    workThisWeek = signal(0);
    requiredWorkThisWeek = signal(0);
    chartOptions = signal<any>(null);

    defaultOptions = () => ({});

    reload(): void {
        this.#stats?.showMyWorkingTime().subscribe((response: any) => {
            const workInfo = response.workinfo ?? [];

            const today = moment().format('YYYY-MM-DD');
            if (!workInfo.some((e: any) => e.key === today)) {
                const todayEntry = (response.data ?? []).find((e: any) => e.key === today);
                if (todayEntry) {
                    workInfo.push({ key: today, day: moment().format('DD.MM.YYYY'), value: Number(todayEntry.value ?? 0), class: 'work-bar-default', required: 8 });
                }
            }

            const dataOk: { x: string; y: number }[] = [];
            const dataLow: { x: string; y: number }[] = [];
            const dataVac: { x: string; y: number }[] = [];

            workInfo.forEach((entry: any) => {
                const dayKey = entry.key ?? moment(entry.day, 'DD.MM.YYYY').format('YYYY-MM-DD');
                const value = Number(entry.value ?? 0);
                dataOk.push({ x: dayKey, y: entry.class === 'work-bar-default' ? value : 0 });
                dataLow.push({ x: dayKey, y: entry.class === 'work-bar-danger' ? value : 0 });
                dataVac.push({ x: dayKey, y: entry.class === 'work-bar-holiday' ? value : 0 });
            });

            this.workThisWeek.set(Number(response.work_this_week ?? 0));
            this.requiredWorkThisWeek.set(Number(response.required_work_this_week ?? 0));
            this.averageSoll.set(Number(response.required_hours ?? this.#global.user?.getHpw() ?? 0));
            this.average.set(Number(response.average ?? 0));

            this.chartOptions.set({
                ...EChartsStackedBarOptions,
                series: [
                    { name: $localize`:@@i18n.hr.timeOk:time OK`, type: 'bar' as const, stack: 'time', itemStyle: { color: Color.fromVar('--color-primary-0', '').toHexString() }, data: dataOk.map((d) => [d.x, d.y]) },
                    { name: $localize`:@@i18n.hr.timeNotEnought:nicht genug`, type: 'bar' as const, stack: 'time', itemStyle: { color: Color.fromVar('--color-danger', '').toHexString() }, data: dataLow.map((d) => [d.x, d.y]) },
                    { name: $localize`:@@i18n.hr.timeVacationOrWeekend:vacation / weekend`, type: 'bar' as const, stack: 'time', itemStyle: { color: Color.fromVar('--color-cyan', '').toHexString() }, data: dataVac.map((d) => [d.x, d.y]) },
                ],
                tooltip: {
                    ...EChartsStackedBarOptions.tooltip,
                    formatter: (params: any) => {
                        if (!params?.length) return '';
                        const date = moment(params[0].axisValue).format('YYYY-MM-DD');
                        let html = `<div style="font-weight: bold; margin-bottom: 8px;">${date}</div>`;
                        params.forEach((param: any) => {
                            if (param.value[1] > 0) {
                                html += `<div style="display: flex; justify-content: space-between; margin: 4px 0;">
                                    <span style="color: ${param.color};">${param.seriesName}</span>
                                    <span style="font-family: monospace;">${param.value[1].toPrecision(2)}h</span>
                                </div>`;
                            }
                        });
                        return html;
                    },
                },
            });

            this.#echartsInstance?.setOption(this.chartOptions(), true);
        });
    }

    onChartInit = (ec: any) => (this.#echartsInstance = ec);
}
