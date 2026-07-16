import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { StatsService } from '@models/stats-service';
import { BaseWidgetComponent } from '../base.widget.component';
import { EChartsStackedBarOptions } from '@charts/echarts-presets';
import { Color } from '@constants/Color';
import { MoneyShortPipe } from '@pipes/mshort.pipe';
import { NxGlobal } from '@app/nx/nx.global';
import { WIDGET_SHARED } from '../widgets.shared';
import { ECHARTS_DEFAULT_TOOLTIP_OPTIONS } from '@charts/echarts-presets';
import type { EChartsOption } from 'echarts';
import type { TopLevelFormatterParams } from 'echarts/types/dist/shared';

import { RevenueCurrentYearResponse } from '@models/api-response';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-revenue-current-year',
    templateUrl: './widget-revenue-current-year.component.html',
    styleUrls: ['./../base.widget.component.scss'],
    providers: [MoneyShortPipe],
    imports: [...WIDGET_SHARED],
})
export class WidgetRevenueCurrentYearComponent extends BaseWidgetComponent {
    #stats = inject(StatsService);

    chartOptions = signal<EChartsOption>({ ...EChartsStackedBarOptions, series: [] });
    data = signal<RevenueCurrentYearResponse | null>(null);
    avgCost = signal(0);

    defaultOptions = () => ({});

    yearProgress = () => {
        const now = new Date(), y = now.getFullYear();
        return +((now.getTime() - new Date(y, 0, 1).getTime()) / (new Date(y + 1, 0, 1).getTime() - new Date(y, 0, 1).getTime()) * 12).toFixed(4);
    };

    reload(): void {
        this.#stats?.showRevenueCurrentYear().subscribe((data: RevenueCurrentYearResponse) => {
            this.avgCost.set(data.expenses / 12);
            this.data.set(data);

            while (data.current.length < 12) data.current.push({ sum: 0 });
            while (data.last.length < 12) data.last.push({ sum: 0, month: '' });

            const avg = this.avgCost();
            const capped = (y: number, i: number) => (y > data.last[i].sum ? data.last[i].sum : y);
            const mcmax = data.current.map((_, i) => (_.sum >= avg ? capped(_.sum, i) : 0));
            const mcmin = data.current.map((_, i) => (_.sum < avg ? capped(_.sum, i) : 0));
            const mlcappedmax = data.current.map((_, i) => (_.sum >= avg && _.sum > data.last[i].sum ? _.sum - data.last[i].sum : 0));
            const mlcappedmin = data.current.map((_, i) => (_.sum < avg && _.sum > data.last[i].sum ? _.sum - data.last[i].sum : 0));
            const mlmissing = data.last.map((_, i) => (_.sum > data.current[i].sum ? _.sum - data.current[i].sum : 0));

            const categories = data.last.map((_) => _.month);
            const maxY = Math.max(avg * 1.1, ...data.current.map((_) => _.sum), ...data.last.map((_) => _.sum));

            const r12byMonth = new Map((data.revenue12 ?? []).map((_) => [_.month, _.sum]));
            // Rolling 12-month revenue averaged to a monthly value so it shares the scale of the bars/cost line.
            const revenue12 = categories.map((m) => (r12byMonth.has(m) ? r12byMonth.get(m)! / 12 : null));

            this.chartOptions.set({
                ...this.chartOptions(),
                xAxis: { type: 'category', data: categories, show: false },
                yAxis: { type: 'value', min: 0, max: maxY, show: false },
                tooltip: {
                    trigger: 'axis',
                    ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS,
                    formatter: (params: TopLevelFormatterParams) => {
                        const arr = [params].flat();
                        const i = arr[0].dataIndex!;
                        const revenueCurrentYear = mcmax[i] + mcmin[i] + mlcappedmax[i] + mlcappedmin[i];
                        const revenueLastYear = mcmax[i] + mcmin[i] + mlmissing[i];
                        const sigCol = revenueCurrentYear < avg ? 'warning' : 'primary';
                        const f = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
                        const sym = NxGlobal.global.currencySymbol();
                        const month = categories[i];
                        const r12 = revenue12[i];
                        const r12Row =
                            r12 == null
                                ? ''
                                : `<div class="hstack gap-2 w-100"><div class="flex-fill"><strong>Ø ${$localize`:@@i18n.dashboard.revenue12m:Revenue (12m)`}:</strong></div><div class="text-end"> ${r12.toLocaleString(undefined, f)} ${sym}</div></div>`;
                        return `<div class="p-2 w-100">
                            ${month ? `<div class="text-muted mb-1 notranslate">${month}</div>` : ''}
                            <div class="hstack gap-2 w-100"><div class="flex-fill text-${sigCol}"><strong>Current Year:</strong></div><div class="text-end"> ${revenueCurrentYear.toLocaleString(undefined, f)} ${sym}</div></div>
                            <div class="hstack gap-2 w-100"><div class="flex-fill"><strong>Last Year:</strong></div><div class="text-end"> ${revenueLastYear.toLocaleString(undefined, f)} ${sym}</div></div>
                            <div class="hstack gap-2 w-100"><div class="flex-fill text-primary-3"><strong>Monthly Cost:</strong></div><div class="text-end"> ${avg.toLocaleString(undefined, f)} ${sym}</div></div>
                            ${r12Row}
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
                    { name: $localize`:@@i18n.dashboard.revenue12m:Revenue (12m)`, type: 'line' as const, smooth: true, connectNulls: true, itemStyle: { color: '#ffffff' }, lineStyle: { color: '#ffffff', width: 2 }, symbol: 'none', data: revenue12 },
                ],
            });
        });
    }

}
