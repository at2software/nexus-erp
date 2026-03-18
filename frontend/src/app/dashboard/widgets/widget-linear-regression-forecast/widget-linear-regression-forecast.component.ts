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

    ngOnInit() {
        this.initChartOptions()
        this.reload()
    }

    defaultOptions = () => ({})

    initChartOptions() {
        this.chartOptions = {
            ...EChartsRangeAreaOptions,
            series: []
        }
    }

    onChartInit(ec: any) {
        this.echartsInstance = ec
    }

    #calculateConfidenceInterval(forecast: number, standardError: number, confidenceLevel: number): { lower: number; upper: number } {
        // Z-scores for different confidence levels
        const zScores: Record<number, number> = {
            68: 1.0,    // ~68% (1 standard deviation)
            95: 1.96,   // ~95%
            99: 2.58    // ~99%
        };
        
        const zScore = zScores[confidenceLevel] || 1.96;
        const margin = zScore * standardError;
        
        return {
            lower: forecast - margin,
            upper: forecast + margin
        };
    }

    reload(): void {
        this.stats?.get('stats/linear-regression-forecast').subscribe((data: LinearRegressionData) => {
            this.data = data;
            
            // Prepare data for chart
            const sortedHistorical = data.historical_data.sort((a, b) => 
                new Date(a.date).getTime() - new Date(b.date).getTime()
            );
            
            const categories = sortedHistorical.map(item => moment(item.date).valueOf());
            const forecasts = sortedHistorical.map(item => item.forecast);
            
            // Calculate confidence intervals for each data point
            const confidence99Upper = sortedHistorical.map(item => this.#calculateConfidenceInterval(item.forecast, item.standard_error, 99).upper);
            const confidence99Lower = sortedHistorical.map(item => this.#calculateConfidenceInterval(item.forecast, item.standard_error, 99).lower);
            
            const confidence95Upper = sortedHistorical.map(item => this.#calculateConfidenceInterval(item.forecast, item.standard_error, 95).upper);
            const confidence95Lower = sortedHistorical.map(item => this.#calculateConfidenceInterval(item.forecast, item.standard_error, 95).lower);
            
            const confidence68Upper = sortedHistorical.map(item => this.#calculateConfidenceInterval(item.forecast, item.standard_error, 68).upper);
            const confidence68Lower = sortedHistorical.map(item => this.#calculateConfidenceInterval(item.forecast, item.standard_error, 68).lower);

            const expenses = sortedHistorical.map(item => item.annual_expenses ?? null);
            const revenue_12 = sortedHistorical.map(item => item.revenue_12 ?? null);

            const yMax = (getMedian(confidence99Upper) ?? 0) * 1.2

            // Convert to ECharts format - using proper range areas
            const echartsData = [
                // 99% confidence interval (background area) - bottom layer
                {
                    name: '99% Confidence Lower',
                    type: 'line',
                    data: confidence99Lower.map((lower, i) => [categories[i], lower]),
                    lineStyle: { opacity: 0 },
                    symbol: 'none',
                    stack: 'confidence99',
                    z: 1
                },
                {
                    name: '99% Confidence',
                    type: 'line',
                    data: confidence99Upper.map((upper, i) => [categories[i], upper - confidence99Lower[i]]),
                    lineStyle: { opacity: 0 },
                    symbol: 'none',
                    areaStyle: {
                        color: Color.fromVar('primary').darken(35).toHexString(),
                        opacity: 0.3,
                        ...EChartsDualShadowAreaStyle
                    },
                    stack: 'confidence99',
                    z: 2
                },
                // 95% confidence interval 
                {
                    name: '95% Confidence Lower',
                    type: 'line',
                    data: confidence95Lower.map((lower, i) => [categories[i], lower]),
                    lineStyle: { opacity: 0 },
                    symbol: 'none',
                    stack: 'confidence95',
                    z: 3
                },
                {
                    name: '95% Confidence',
                    type: 'line',
                    data: confidence95Upper.map((upper, i) => [categories[i], upper - confidence95Lower[i]]),
                    lineStyle: { opacity: 0 },
                    symbol: 'none',
                    areaStyle: {
                        color: Color.fromVar('primary').darken(30).toHexString(),
                        opacity: 0.4,
                        ...EChartsDualShadowAreaStyle
                    },
                    stack: 'confidence95',
                    z: 4
                },
                // 68% confidence interval (top layer)
                {
                    name: '68% Confidence Lower',
                    type: 'line',
                    data: confidence68Lower.map((lower, i) => [categories[i], lower]),
                    lineStyle: { opacity: 0 },
                    symbol: 'none',
                    stack: 'confidence68',
                    z: 5
                },
                {
                    name: '68% Confidence',
                    type: 'line',
                    data: confidence68Upper.map((upper, i) => [categories[i], upper - confidence68Lower[i]]),
                    lineStyle: { opacity: 0 },
                    symbol: 'none',
                    areaStyle: {
                        color: Color.fromVar('primary').darken(25).toHexString(),
                        opacity: 0.5,
                        ...EChartsDualShadowAreaStyle
                    },
                    stack: 'confidence68',
                    z: 6
                },
                // Expenses line (dashed) - above confidence areas
                {
                    name: 'Expenses',
                    type: 'line',
                    symbol: 'none',
                    lineStyle: {
                        color: Color.fromVar('yellow').toHexString(),
                        width: 2,
                        type: 'dashed'
                    },
                    data: expenses.map((value, i) => [categories[i], value]),
                    z: 10
                },
                // Forecast line (white) - above confidence areas
                {
                    name: 'Forecast',
                    type: 'line',
                    symbol: 'none',
                    lineStyle: {
                        color: '#ffffff',
                        width: 2
                    },
                    data: forecasts.map((forecast, i) => [categories[i], forecast]),
                    z: 11
                },
                // Actual Revenue line - above confidence areas
                {
                    name: 'real Revenue',
                    type: 'line',
                    symbol: 'none',
                    lineStyle: {
                        color: Color.fromVar('primary').toHexString(),
                        width: 2,
                        type: 'dashed'
                    },
                    data: revenue_12.map((value, i) => [categories[i], value]),
                    z: 12
                }
            ];

            this.chartOptions = {
                ...this.chartOptions,
                yAxis: {
                    ...this.chartOptions.yAxis,
                    min: 0,
                    max: yMax
                },
                tooltip: {
                    ...this.chartOptions.tooltip,
                    formatter: (params: any) => {
                        if (!params || params.length === 0) return '';
                        
                        const dataIndex = params[0].dataIndex;
                        const forecast = forecasts[dataIndex];
                        const standardError = sortedHistorical[dataIndex].standard_error;
                        const _expenses = expenses[dataIndex];
                        const revenue = revenue_12[dataIndex];
                        const r2 = sortedHistorical[dataIndex].r2;
                        const date = moment(categories[dataIndex]).format('YYYY-MM');
                        const deviation = revenue ? Math.abs(revenue / forecast - 1) * 100 : 0;
                        
                        let tooltip = `
                            <div class="p-2">
                                <div class="fw-bold mb-1">${date}</div>
                                <div class="hstack gap-2">
                                    <span class="font-monospace text-white fw-bold">Forecast:</span>
                                    <span class="ms-auto font-monospace">${this.moneyPipe.transform(forecast)}</span>
                                </div>
                                <div class="hstack gap-2">
                                    <span class="font-monospace text-muted">R²:</span>
                                    <span class="ms-auto font-monospace">${(r2 * 100).toFixed(1)}%</span>
                                </div>
                                <div class="hstack gap-2">
                                    <span class="font-monospace text-muted">Std. Error:</span>
                                    <span class="ms-auto font-monospace">${this.moneyPipe.transform(standardError)}</span>
                                </div>
                                <div class="hstack gap-2">
                                    <span class="font-monospace text-yellow">Expenses:</span>
                                    <span class="ms-auto font-monospace">${this.moneyPipe.transform(_expenses)}</span>
                                </div>`;
                        if (revenue) {
                            tooltip += `<div class="hstack gap-2">
                                <span class="font-monospace text-primary">reality (Δ ${deviation.toFixed(1)}%):</span>
                                <span class="ms-auto font-monospace">${this.moneyPipe.transform(revenue)}</span>
                            </div>`;
                        }
                        tooltip += `</div>`;
                        return tooltip;
                    }
                },
                series: echartsData
            };
            
            if (this.echartsInstance) {
                this.echartsInstance.setOption(this.chartOptions, true);
            }
        });
    }
}