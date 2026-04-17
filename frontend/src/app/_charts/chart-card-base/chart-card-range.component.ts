import { Component, input, OnChanges } from '@angular/core';
import { LineChartParamComponent } from './chart-card-base.component';
import { Color } from 'src/constants/Color';
import { ECHARTS_DEFAULT_TOOLTIP_OPTIONS } from '../ChartOptions';
import moment from 'moment';
import { CASHFLOW_I18N } from '@dashboard/widgets/widget-cashflow/widget-cashflow.options';
import { EChartsRangeAreaOptions, EChartsDualShadowAreaStyle } from '../ChartOptions';
import { NgxEchartsDirective } from 'ngx-echarts';
import { CommonModule } from '@angular/common';
import { MoneyPipe } from 'src/pipes/money.pipe';
@Component({
    selector: 'chart-card-range',
    templateUrl: './chart-card-base.component.html',
    styleUrls: ['./chart-card-base.component.scss'],
    standalone: true,
    imports: [NgxEchartsDirective, CommonModule]
})
export class LineChartRangeComponent extends LineChartParamComponent implements OnChanges {

    computeTrend = input<boolean>(true)
    seriesCount  = input<number>(1)

    moneyPipe = new MoneyPipe()

    get primaryColorVar(): string {
        return `var(--bs-${this.getColor(0)})`
    }

    startOfStats = () => moment().startOf('month').subtract(36, "month")

    individualOptions = () => ({
        ...EChartsRangeAreaOptions,
        series: []
    })

    updateSeries(result: any[]): void {
        if (!result || result.length === 0) return

        const findNode = (d:string, a:any[]) => a?.find(_=>_.x == d)

        this.value = result.length ? result[0].current : 0

        // Fill missing date gaps
        result.forEach((_: any) => {
            const blanko: any[] = []
            let last: any | undefined = undefined
            for (let i = this.startOfStats(); i < moment(); i.add(1, 'month')) {
                const date = i.format('YYYY-MM-01')
                const node = findNode(date, _['data'])
                last = node ? node : last
                blanko.push(last ? last : { x: date, y: 0, min: 0, max: 0 })
            }
            _['data'] = blanko
        })

        // Calculate max value for y-axis
        const useSharedStack = result.length > 1
        let maxVal = 0

        if (useSharedStack) {
            // For stacked charts: compute aggregate max at each time point
            const aggregateByDate: Record<string, number> = {}
            result.forEach((_: any) => {
                _['data'].forEach((__: any) => {
                    const avg = (__.min + __.max) / 2
                    aggregateByDate[__.x] = (aggregateByDate[__.x] || 0) + avg
                })
            })
            maxVal = Math.max(...Object.values(aggregateByDate), 0)
        } else {
            // For single series: find individual max
            result.forEach((_: any, i: number) => {
                _['data'].forEach((__: any) => {
                    if (this.offset() == 'none' || i == 0) {
                        maxVal = Math.max(maxVal, __.max)
                    }
                })
            })
        }

        const padding = maxVal * .2

        // Convert to ECharts series format
        const echartsData: any[] = []

        // Use the same useSharedStack determination from above
        const sharedStackName = 'combined'

        if (useSharedStack) {
            // For multiple series: create simple stacked areas using average values
            result.forEach((_: any, i: number) => {
                const baseColor = Color.fromVar(this.getColor(i))
                const areaColor = baseColor.toHexString()

                // Single area using average value (midpoint of min/max) for stacking
                echartsData.push({
                    name: CASHFLOW_I18N(_['name']),
                    type: 'line',
                    data: _['data'].map((__: any) => [__.x, (__.min + __.max) / 2]),
                    lineStyle: {
                        color: baseColor.toHexString(),
                        width: 2
                    },
                    symbol: 'none',
                    areaStyle: {
                        color: (new Color(areaColor)).darken(25).toHexString(),
                        ...EChartsDualShadowAreaStyle
                    },
                    stack: sharedStackName,
                    z: 10 + i
                })
            })
        } else {
            // For single series: show range (min-max) with separate base and range areas
            result.forEach((_: any, i: number) => {
                const baseColor = Color.fromVar(this.getColor(i))
                const areaColor = baseColor.toHexString()

                // Bottom area (from 0 to min)
                echartsData.push({
                    name: `${CASHFLOW_I18N(_['name'])} Base`,
                    type: 'line',
                    data: _['data'].map((__: any) => [__.x, __.min]),
                    lineStyle: { opacity: 0 },
                    symbol: 'none',
                    areaStyle: {
                        color: 'transparent',
                        opacity: 0
                    },
                    stack: `range_${i}`,
                    z: 1,
                    showInLegend: false
                })

                // Top area (range area between min and max)
                echartsData.push({
                    name: `${CASHFLOW_I18N(_['name'])} Range`,
                    type: 'line',
                    data: _['data'].map((__: any) => [__.x, __.max - __.min]),
                    lineStyle: { opacity: 0 },
                    symbol: 'none',
                    areaStyle: {
                        color: (new Color(areaColor)).darken(25).toHexString(),
                        ...EChartsDualShadowAreaStyle
                    },
                    stack: `range_${i}`,
                    z: 2,
                    showInLegend: false
                })
            })
        }

        // Add line series (average lines above the range areas) - only for single series
        if (!useSharedStack) {
            result.forEach((serie: any, seriesIndex: number) => {
                const lineColor = Color.fromVar(this.getColor(seriesIndex)).toHexString()
                echartsData.push({
                    name: seriesIndex >= this.seriesCount() ? 'Vergleichszeitraum' : CASHFLOW_I18N(serie['name']),
                    type: 'line',
                    symbol: 'none',
                    lineStyle: {
                        color: lineColor,
                        width: 2
                    },
                    data: serie['data'].map((_: any, i: number) => {
                        let y = .5 * (_.min + _.max)
                        if (i == serie['data'].length - 1 && serie['current']) {
                            y = serie['current']
                        }
                        return [_.x, y]
                    }),
                    z: 10 + seriesIndex  // Ensure lines appear above range areas
                })
            })
        }

        // Calculate trend if needed (when comparing multiple series)
        if (result.length >= 2 && echartsData.length >= 2) {
            const currentSeries = echartsData[1]?.data || []
            const lastSeries = echartsData[3]?.data || []
            if (currentSeries.length > 0 && lastSeries.length > 0) {
                const current = currentSeries[currentSeries.length - 1]?.[1] || 0
                const last = lastSeries[lastSeries.length - 1]?.[1] || 0
                this.trend = current - last
            }
        }

        // Add trend lines if computeTrend is enabled and not stacked (trend lines don't make sense for stacked charts)
        if (this.computeTrend() && !useSharedStack) {
            // Only add trend lines for the main data series (not range areas)
            echartsData.forEach((series) => {
                if (series.type === 'line' && series.data.length > 10 && series.lineStyle?.color && !series.name.includes('Base') && !series.name.includes('Range')) {
                    const trendData = this.#calculateTrendLine(series.data)
                    if (trendData.length > 0) {
                        const trendColor = (new Color(series.lineStyle.color)).lighten(35).toHexString()
                        echartsData.push({
                            name: `${series.name} Trend`,
                            type: 'line',
                            symbol: 'none',
                            lineStyle: {
                                color: trendColor,
                                width: 1,
                                type: 'dashed'
                            },
                            data: trendData
                        })
                    }
                }
            })
        }

        this.chartOptions = {
            ...this.individualOptions(),
            xAxis: {
                type: 'time',
                show: false
            },
            yAxis: {
                type: 'value',
                min: 0,
                max: maxVal + padding,
                show: false
            },
            tooltip: {
                trigger: 'axis',
                ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS,
                confine: true,
                formatter: (params: any) => {
                    if (!params || params.length === 0) return '';

                    const dataIndex = params[0].dataIndex;
                    const xValue = params[0].axisValue;
                    const headerColor = Color.fromVar(this.getColor(0)).toHexString();

                    // Group by original series (skip trend lines, range areas, and base areas)
                    const originalSeries = params.filter((p: any) => !p.seriesName.includes('Trend') && !p.seriesName.includes('Range') && !p.seriesName.includes('Base'));

                    // Header with date
                    let html = `<div class="text-center d-flex justify-content-between align-items-center" style="color: ${headerColor}; padding: 4px;">`;
                    html += `<span class="fw-bold">${moment(xValue).format('YYYY-MM')}</span>`;
                    html += `</div>`;

                    // Show all series when stacked (multiple series)
                    if (useSharedStack && originalSeries.length > 1) {
                        let total = 0;
                        originalSeries.forEach((param: any, i: number) => {
                            const value = param.value[1] || param.value;
                            total += value;
                            const seriesColor = Color.fromVar(this.getColor(i)).toHexString();
                            html += `<div class="f-b p-0 hstack gap-2">`;
                            html += `<div class="flex-fill">${param.seriesName}:</div>`;
                            html += `<div class="text-end font-monospace" style="color:${seriesColor};">${this.moneyPipe.transform(value)}${this.suffix}</div></div>`;
                        });
                        // Add total row
                        html += `<div class="f-b p-0 hstack gap-2" style="border-top: 1px solid rgba(255,255,255,0.3); margin-top: 4px; padding-top: 4px;">`;
                        html += `<div class="flex-fill">∑:</div>`;
                        html += `<div class="text-end font-monospace" style="color:${headerColor};">${this.moneyPipe.transform(total)}${this.suffix}</div></div>`;
                    } else {
                        // Single series - show current/average
                        originalSeries.forEach((param: any) => {
                            const isLast = dataIndex === originalSeries[0]?.data?.length - 1;
                            const name = isLast ? $localize`:@@i18n.common.current:current` : $localize`:@@i18n.common.average:average`;

                            html += `<div class="f-b p-0 hstack gap-2">`;
                            html += `<div class="flex-fill">${name}:</div>`;
                            html += `<div class="text-end font-monospace" style="color:${headerColor};">${this.moneyPipe.transform(param.value[1] || param.value)}${this.suffix()}</div></div>`;
                        });
                    }
                    return `<div class="arrow_box">${html}</div>`;
                }
            },
            series: echartsData
        };

        if (this.echartsInstance) {
            this.echartsInstance.setOption(this.chartOptions, true);
        }
    }
    
    #calculateTrendLine(data: any[]): any[] {
        if (data.length < 6) return [];
        
        // Find midpoint with most significant change in averages
        let bestMidPoint = Math.floor(data.length / 2);
        let maxDiff = 0;
        
        // Test different midpoints to find the most significant change
        for (let mid = Math.floor(data.length * 0.3); mid <= Math.floor(data.length * 0.7); mid++) {
            const firstHalf = data.slice(0, mid);
            const secondHalf = data.slice(mid);
            
            if (firstHalf.length < 2 || secondHalf.length < 2) continue;
            
            const firstAvg = firstHalf.reduce((sum, point) => sum + (point[1] || 0), 0) / firstHalf.length;
            const secondAvg = secondHalf.reduce((sum, point) => sum + (point[1] || 0), 0) / secondHalf.length;
            const diff = Math.abs(secondAvg - firstAvg);
            
            if (diff > maxDiff) {
                maxDiff = diff;
                bestMidPoint = mid;
            }
        }
        
        const firstHalf = data.slice(0, bestMidPoint);
        const secondHalf = data.slice(bestMidPoint);
        
        const firstAvg = firstHalf.reduce((sum, point) => sum + (point[1] || 0), 0) / firstHalf.length;
        const secondAvg = secondHalf.reduce((sum, point) => sum + (point[1] || 0), 0) / secondHalf.length;
        
        // Return two horizontal line segments
        return [
            // First horizontal line (from start to midpoint)
            [data[0][0], firstAvg],
            [data[bestMidPoint - 1][0], firstAvg],
            // Second horizontal line (from midpoint to end)  
            [data[bestMidPoint][0], secondAvg],
            [data[data.length - 1][0], secondAvg]
        ];
    }
}
