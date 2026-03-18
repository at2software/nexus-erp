import { Component, inject, OnInit } from '@angular/core';
import { StatsService } from 'src/models/stats-service';
import { BaseWidgetComponent } from '../base.widget.component';
import { EChartsStackedBarOptions } from '@charts/ChartOptions';
import { Color } from 'src/constants/Color';
import { MoneyShortPipe } from 'src/pipes/mshort.pipe';
import { GlobalService } from '@models/global.service';
import { NxGlobal } from '@app/nx/nx.global';
import { getMonthsIntoYear } from '@constants/getYearProgress';
import { WidgetsModule } from '../widgets.module';
import { ECHARTS_DEFAULT_TOOLTIP_OPTIONS } from '@charts/ChartOptions';


@Component({
    selector: 'widget-revenue-current-year',
    templateUrl: './widget-revenue-current-year.component.html',
    styleUrls: ['./widget-revenue-current-year.component.scss', './../base.widget.component.scss'],
    providers: [MoneyShortPipe],
    standalone: true,
    imports: [WidgetsModule]
})
export class WidgetRevenueCurrentYearComponent extends BaseWidgetComponent implements OnInit {
    stats = inject(StatsService)
    chartOptions: any
    echartsInstance: any
    data: any
    moneyPipe = inject(MoneyShortPipe)
    global = inject(GlobalService)
    avgCost: number = 0

    ngOnInit() {
        this.initChartOptions()
        this.reload()
    }

    initChartOptions() {
        this.chartOptions = {
            ...EChartsStackedBarOptions,
            series: []
        }
    }

    onChartInit(ec: any) {
        this.echartsInstance = ec
    }

    defaultOptions = () => ({})
    yearProgress = getMonthsIntoYear

    reload(): void {
        this.stats?.showRevenueCurrentYear().subscribe((data: any) => {
            this.avgCost = data.expenses / 12
            this.data = data
            while (data.current.length < 12) {
                data.current.push({ sum: 0 })
            }
            while (data.last.length < 12) {
                data.last.push({ sum: 0 })
            }
            const capped = (y: number, i: number) => y > data.last[i].sum ? data.last[i].sum : y
            const mcmax = data.current.map((_: any, i: number) => _.sum >= this.avgCost ? capped(_.sum, i) : 0)
            const mcmin = data.current.map((_: any, i: number) => _.sum < this.avgCost ? capped(_.sum, i) : 0)
            const mlcappedmax = data.current.map((_: any, i: number) => _.sum >= this.avgCost && _.sum > data.last[i].sum ? (_.sum - data.last[i].sum) : 0)
            const mlcappedmin = data.current.map((_: any, i: number) => _.sum < this.avgCost && _.sum > data.last[i].sum ? (_.sum - data.last[i].sum) : 0)
            const mlmissing = data.last.map((_: any, i: number) => _.sum > data.current[i].sum ? (_.sum - data.current[i].sum) : 0)
            
            const categories = data.last.map((_: any) => _.month);
            const maxY = Math.max(this.avgCost * 1.1, ...data.current.map((_: any) => _.sum), ...data.last.map((_: any) => _.sum));

            // Convert to ECharts format
            const echartsData = [
                {
                    name: 'High Revenue (≥ Avg Cost)',
                    type: 'bar' as const,
                    stack: 'revenue',
                    itemStyle: { color: Color.fromVar('', '--color-primary-0').toHexString() },
                    data: mcmax
                },
                {
                    name: 'Low Revenue (< Avg Cost)',
                    type: 'bar' as const,
                    stack: 'revenue',
                    itemStyle: { color: Color.fromVar('', '--color-warning-darker').toHexString() },
                    data: mcmin
                },
                {
                    name: 'Growth High Revenue',
                    type: 'bar' as const,
                    stack: 'revenue',
                    itemStyle: { color: Color.fromVar('', '--color-primary-1').toHexString() },
                    data: mlcappedmax
                },
                {
                    name: 'Growth Low Revenue',
                    type: 'bar' as const,
                    stack: 'revenue',
                    itemStyle: { color: Color.fromVar('', '--color-warning').toHexString() },
                    data: mlcappedmin
                },
                {
                    name: 'Missing vs Last Year',
                    type: 'bar' as const,
                    stack: 'revenue',
                    itemStyle: { color: '#444444' },
                    data: mlmissing
                },
                {
                    name: 'Monthly Cost',
                    type: 'line' as const,
                    itemStyle: { 
                        color: Color.fromVar('', '--color-primary-3').toHexString(),
                        borderWidth: 2
                    },
                    lineStyle: {
                        color: Color.fromVar('', '--color-primary-3').toHexString(),
                        width: 2
                    },
                    symbol: 'none',
                    data: Array(12).fill(this.avgCost)
                }
            ];

            this.chartOptions = {
                ...this.chartOptions,
                xAxis: {
                    type: 'category',
                    data: categories,
                    show: false
                },
                yAxis: {
                    type: 'value',
                    min: 0,
                    max: maxY,
                    show: false
                },
                tooltip: {
                    trigger: 'axis',
                    ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS,
                    formatter: (params: any) => {
                        const dataIndex = params[0].dataIndex;
                        const bar1 = mcmax[dataIndex] || 0;
                        const bar2 = mcmin[dataIndex] || 0;
                        const bar3 = mlcappedmax[dataIndex] || 0;
                        const bar4 = mlcappedmin[dataIndex] || 0;
                        const bar5 = mlmissing[dataIndex] || 0;

                        const revenueCurrentYear = bar1 + bar2 + bar3 + bar4;
                        const revenueLastYear = bar1 + bar2 + bar5;
                        const sigCol: string = (revenueCurrentYear < this.avgCost) ? 'warning' : 'primary'
                        const f = { minimumFractionDigits: 2, maximumFractionDigits: 2 }
                        const currencySymbol = NxGlobal.global.currencySymbol()
                        
                        return `
                          <div class="p-2 w-100">
                            <div class="hstack gap-2 w-100"><div class="flex-fill text-${sigCol}"><strong>Current Year:</strong></div><div class="text-end"> ${revenueCurrentYear.toLocaleString(undefined, f)} ${currencySymbol}</div></div>
                            <div class="hstack gap-2 w-100"><div class="flex-fill"><strong>Last Year:</strong></div><div class="text-end"> ${revenueLastYear.toLocaleString(undefined, f)} ${currencySymbol}</div></div>
                            <div class="hstack gap-2 w-100"><div class="flex-fill text-primary-3"><strong>Monthly Cost:</strong></div><div class="text-end"> ${this.avgCost.toLocaleString(undefined, f)} ${currencySymbol}</div></div>
                          </div>
                        `;
                    }
                },
                series: echartsData
            };
        })
    }
}
