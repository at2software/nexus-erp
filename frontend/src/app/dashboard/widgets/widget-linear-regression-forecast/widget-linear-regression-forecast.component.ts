import { Component, inject, OnInit } from '@angular/core';
import { StatsService } from 'src/models/stats-service';
import { BaseWidgetComponent } from '../base.widget.component';
import { EChartsRangeAreaOptions, EChartsDualShadowAreaStyle } from '@charts/ChartOptions';
import { Color } from 'src/constants/Color';
import { MoneyShortPipe } from 'src/pipes/mshort.pipe';
import moment from 'moment';
import { WidgetsModule } from '../widgets.module';

import { getMedian } from '@constants/getMedian';

interface LinearRegressionData {
    current: {
        forecast: number;
        r2: number;
        standard_error: number;
        formula: string;
        generated_at: string;
    };
    historical_data: {
        date: string;
        forecast: number;
        r2: number;
        standard_error: number;
        annual_expenses: number;
        revenue_12?: number;
    }[];
    meta: {
        data_points: number;
        date_range: {
            from: string;
            to: string;
        };
    };
}

@Component({
    selector: 'widget-linear-regression-forecast',
    templateUrl: './widget-linear-regression-forecast.component.html',
    styleUrls: ['./widget-linear-regression-forecast.component.scss', './../base.widget.component.scss'],
    providers: [MoneyShortPipe],
    standalone: true,
    imports: [WidgetsModule]
})
export class WidgetLinearRegressionForecastComponent extends BaseWidgetComponent implements OnInit {
    stats = inject(StatsService)
    chartOptions: any
    echartsInstance: any
    data: LinearRegressionData | null = null
    moneyPipe = inject(MoneyShortPipe)

    defaultOptions = () => ({})

    override ngOnInit() {
        this.initChartOptions()
        super.ngOnInit()
    }

    initChartOptions() {
        this.chartOptions = { ...EChartsRangeAreaOptions, series: [] }
    }

    onChartInit(ec: any) {
        this.echartsInstance = ec
    }

    #ci(forecast: number, se: number, level: number) {
        const z: Record<number, number> = { 68: 1.0, 95: 1.96, 99: 2.58 }
        const margin = (z[level] ?? 1.96) * se
        return { lower: forecast - margin, upper: forecast + margin }
    }

    #confidenceBand(label: string, ci: { lower: number; upper: number }[], categories: number[], darken: number, opacity: number, z: number) {
        return [
            {
                name: `${label} Lower`, type: 'line', symbol: 'none',
                data: ci.map(({ lower }, i) => [categories[i], lower]),
                lineStyle: { opacity: 0 }, stack: label, z
            },
            {
                name: label, type: 'line', symbol: 'none',
                data: ci.map(({ lower, upper }, i) => [categories[i], upper - lower]),
                lineStyle: { opacity: 0 },
                areaStyle: { color: Color.fromVar('primary').darken(darken).toHexString(), opacity, ...EChartsDualShadowAreaStyle },
                stack: label, z: z + 1
            }
        ]
    }

    reload(): void {
        this.stats?.get('stats/linear-regression-forecast').subscribe((data: LinearRegressionData) => {
            this.data = data

            const sorted = data.historical_data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            const categories = sorted.map(item => moment(item.date).valueOf())
            const forecasts = sorted.map(item => item.forecast)
            const expenses = sorted.map(item => item.annual_expenses ?? null)
            const revenue_12 = sorted.map(item => item.revenue_12 ?? null)

            const ci99 = sorted.map(item => this.#ci(item.forecast, item.standard_error, 99))
            const ci95 = sorted.map(item => this.#ci(item.forecast, item.standard_error, 95))
            const ci68 = sorted.map(item => this.#ci(item.forecast, item.standard_error, 68))

            const yMax = (getMedian(ci99.map(c => c.upper)) ?? 0) * 1.2

            const row = (label: string, cls: string, value: string) =>
                `<div class="hstack gap-2"><span class="font-monospace ${cls}">${label}:</span><span class="ms-auto font-monospace">${value}</span></div>`

            this.chartOptions = {
                ...this.chartOptions,
                yAxis: { ...this.chartOptions.yAxis, min: 0, max: yMax },
                tooltip: {
                    ...this.chartOptions.tooltip,
                    formatter: (params: any) => {
                        if (!params?.length) return ''
                        const i = params[0].dataIndex
                        const forecast = forecasts[i]
                        const { standard_error: se, r2 } = sorted[i]
                        const revenue = revenue_12[i]
                        const deviation = revenue ? Math.abs(revenue / forecast - 1) * 100 : 0
                        return `<div class="p-2">
                            <div class="fw-bold mb-1">${moment(categories[i]).format('YYYY-MM')}</div>
                            ${row('Forecast', 'text-white fw-bold', this.moneyPipe.transform(forecast))}
                            ${row('R²', 'text-muted', `${(r2 * 100).toFixed(1)}%`)}
                            ${row('Std. Error', 'text-muted', this.moneyPipe.transform(se))}
                            ${row('Expenses', 'text-yellow', this.moneyPipe.transform(expenses[i]))}
                            ${revenue ? row(`reality (Δ ${deviation.toFixed(1)}%)`, 'text-primary', this.moneyPipe.transform(revenue)) : ''}
                        </div>`
                    }
                },
                series: [
                    ...this.#confidenceBand('confidence99', ci99, categories, 35, 0.3, 1),
                    ...this.#confidenceBand('confidence95', ci95, categories, 30, 0.4, 3),
                    ...this.#confidenceBand('confidence68', ci68, categories, 25, 0.5, 5),
                    { name: 'Expenses', type: 'line', symbol: 'none', z: 10,
                      lineStyle: { color: Color.fromVar('yellow').toHexString(), width: 2, type: 'dashed' },
                      data: expenses.map((v, i) => [categories[i], v]) },
                    { name: 'Forecast', type: 'line', symbol: 'none', z: 11,
                      lineStyle: { color: '#ffffff', width: 2 },
                      data: forecasts.map((f, i) => [categories[i], f]) },
                    { name: 'real Revenue', type: 'line', symbol: 'none', z: 12,
                      lineStyle: { color: Color.fromVar('primary').toHexString(), width: 2, type: 'dashed' },
                      data: revenue_12.map((v, i) => [categories[i], v]) }
                ]
            }

            this.echartsInstance?.setOption(this.chartOptions, true)
        })
    }
}