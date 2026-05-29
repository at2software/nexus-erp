import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { StatsService } from '@models/stats-service';
import { BaseWidgetComponent } from '../base.widget.component';
import { EChartsStackedBarOptions } from '@charts/echarts-presets';
import { Color } from '@constants/Color';
import { MoneyShortPipe } from '@pipes/mshort.pipe';
import { NxGlobal } from '@app/nx/nx.global';
import { WidgetsModule } from '../widgets.module';
import { ECHARTS_DEFAULT_TOOLTIP_OPTIONS } from '@charts/echarts-presets';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-revenue-current-year',
    templateUrl: './widget-revenue-current-year.component.html',
    styleUrls: ['./widget-revenue-current-year.component.scss', './../base.widget.component.scss'],
    providers: [MoneyShortPipe],
    standalone: true,
    imports: [WidgetsModule],
})
export class WidgetRevenueCurrentYearComponent extends BaseWidgetComponent {
    #stats = inject(StatsService);

    chartOptions = signal<any>({ ...EChartsStackedBarOptions, series: [] });
    data = signal<any>(null);
    avgCost = signal(0);

    defaultOptions = () => ({});

    yearProgress = () => {
        const now = new Date(), y = now.getFullYear();
        return +((now.getTime() - new Date(y, 0, 1).getTime()) / (new Date(y + 1, 0, 1).getTime() - new Date(y, 0, 1).getTime()) * 12).toFixed(4);
    };

    reload(): void {
        this.#stats?.showRevenueCurrentYear().subscribe((data: any) => {
            this.avgCost.set(data.expenses / 12);
            this.data.set(data);

            while (data.current.length < 12) data.current.push({ sum: 0 });
            while (data.last.length < 12) data.last.push({ sum: 0 });

            const avg = this.avgCost();
            const capped = (y: number, i: number) => (y > data.last[i].sum ? data.last[i].sum : y);
            const mcmax = data.current.map((_: any, i: number) => (_.sum >= avg ? capped(_.sum, i) : 0));
            const mcmin = data.current.map((_: any, i: number) => (_.sum < avg ? capped(_.sum, i) : 0));
            const mlcappedmax = data.current.map((_: any, i: number) => (_.sum >= avg && _.sum > data.last[i].sum ? _.sum - data.last[i].sum : 0));
            const mlcappedmin = data.current.map((_: any, i: number) => (_.sum < avg && _.sum > data.last[i].sum ? _.sum - data.last[i].sum : 0));
            const mlmissing = data.last.map((_: any, i: number) => (_.sum > data.current[i].sum ? _.sum - data.current[i].sum : 0));

            const categories = data.last.map((_: any) => _.month);
            const maxY = Math.max(avg * 1.1, ...data.current.map((_: any) => _.sum), ...data.last.map((_: any) => _.sum));

            this.chartOptions.set({
                ...this.chartOptions(),
                xAxis: { type: 'category', data: categories, show: false },
                yAxis: { type: 'value', min: 0, max: maxY, show: false },
                tooltip: {
                    trigger: 'axis',
                    ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS,
                    formatter: (params: any) => {
                        const i = params[0].dataIndex;
                        const revenueCurrentYear = mcmax[i] + mcmin[i] + mlcappedmax[i] + mlcappedmin[i];
                        const revenueLastYear = mcmax[i] + mcmin[i] + mlmissing[i];
                        const sigCol = revenueCurrentYear < avg ? 'warning' : 'primary';
                        const f = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
                        const sym = NxGlobal.global.currencySymbol();
                        return `<div class="p-2 w-100">
                            <div class="hstack gap-2 w-100"><div class="flex-fill text-${sigCol}"><strong>Current Year:</strong></div><div class="text-end"> ${revenueCurrentYear.toLocaleString(undefined, f)} ${sym}</div></div>
                            <div class="hstack gap-2 w-100"><div class="flex-fill"><strong>Last Year:</strong></div><div class="text-end"> ${revenueLastYear.toLocaleString(undefined, f)} ${sym}</div></div>
                            <div class="hstack gap-2 w-100"><div class="flex-fill text-primary-3"><strong>Monthly Cost:</strong></div><div class="text-end"> ${avg.toLocaleString(undefined, f)} ${sym}</div></div>
                        </div>`;
                    },
                },
                series: [
                    { name: $localize`:@@i18n.dashboard.highRevenue:High Revenue (≥ Avg Cost)`, type: 'bar' as const, stack: 'revenue', itemStyle: { color: Color.fromVar('', '--color-primary-0').toHexString() }, data: mcmax },
                    { name: $localize`:@@i18n.dashboard.lowRevenue:Low Revenue (< Avg Cost)`, type: 'bar' as const, stack: 'revenue', itemStyle: { color: Color.fromVar('', '--color-warning-darker').toHexString() }, data: mcmin },
                    { name: $localize`:@@i18n.dashboard.growthHighRevenue:Growth High Revenue`, type: 'bar' as const, stack: 'revenue', itemStyle: { color: Color.fromVar('', '--color-primary-1').toHexString() }, data: mlcappedmax },
                    { name: $localize`:@@i18n.dashboard.growthLowRevenue:Growth Low Revenue`, type: 'bar' as const, stack: 'revenue', itemStyle: { color: Color.fromVar('', '--color-warning').toHexString() }, data: mlcappedmin },
                    { name: $localize`:@@i18n.dashboard.missingVsLastYear:Missing vs Last Year`, type: 'bar' as const, stack: 'revenue', itemStyle: { color: '#444444' }, data: mlmissing },
                    { name: $localize`:@@i18n.dashboard.monthlyCost:Monthly Cost`, type: 'line' as const, itemStyle: { color: Color.fromVar('', '--color-primary-3').toHexString(), borderWidth: 2 }, lineStyle: { color: Color.fromVar('', '--color-primary-3').toHexString(), width: 2 }, symbol: 'none', data: Array(12).fill(avg) },
                ],
            });
        });
    }

}
