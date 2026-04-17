import { Component, effect, input } from '@angular/core';
import { Company } from '@models/company/company.model';
import { NxGlobal } from '@app/nx/nx.global';
import { NgxEchartsDirective } from 'ngx-echarts';
import { Color } from '@constants/Color';
import { EChartsSimpleOptions, ECHARTS_DEFAULT_TOOLTIP_OPTIONS } from '@charts/ChartOptions';
import moment from 'moment';

interface MonthlyBiasData {
    month: string;
    bias_factor: number;
    projects_count: number;
}

@Component({
    selector: 'customer-prediction-bias-chart',
    standalone: true,
    imports: [NgxEchartsDirective],
    template: `
        <div echarts [options]="chartOptions" [initOpts]="{height: 100}" style="height: 100px;"></div>
    `
})
export class CustomerPredictionBiasChartComponent {
    company = input<Company>()
    chartOptions: any = { ...EChartsSimpleOptions, series: [] }

    constructor() {
        effect(() => { if (this.company()?.id) this.#load() })
    }

    #load() {
        NxGlobal.service.get(`companies/${this.company()?.id}/prediction-accuracy`).subscribe((data: MonthlyBiasData[]) => {
            this.chartOptions = this.#buildChart(data ?? [])
        })
    }

    #buildChart(data: MonthlyBiasData[]): any {
        const successColor = Color.fromVar('success').toHexString()
        const dangerColor  = Color.fromVar('danger').toHexString()
        const mutedColor   = 'rgba(255,255,255,0.15)'

        // Build 36-month grid
        const dataMap = new Map(data.map(d => [d.month, d]))
        const months: string[]                       = []
        const barData: ({ value: number | null, itemStyle: any })[] = []
        const tooltipData: (MonthlyBiasData | null)[] = []

        for (let i = 36; i >= 0; i--) {
            const m = moment().subtract(i, 'months').format('YYYY-MM')
            months.push(m)
            const d = dataMap.get(m) ?? null
            if (d) {
                const v = +((1 - d.bias_factor) * 100).toFixed(1)
                barData.push({ value: v, itemStyle: { color: v > 0 ? successColor : v < 0 ? dangerColor : mutedColor } })
                tooltipData.push(d)
            } else {
                barData.push({ value: null, itemStyle: { color: mutedColor } })
                tooltipData.push(null)
            }
        }
        return {
            ...EChartsSimpleOptions,
            xAxis: { type: 'category', data: months, show: false },
            yAxis: { type: 'value', show: false },
            tooltip: {
                trigger: 'axis',
                ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS,
                formatter: (params: any) => {
                    const i = params[0].dataIndex
                    const d = tooltipData[i]
                    const m = months[i]
                    if (!d) {
                        let html = `<div class="text-center d-flex justify-content-between align-items-center" style="padding: 4px;">`
                        html += `<span class="fw-bold">${m}</span></div>`
                        html += `<div class="f-b p-0 hstack gap-2"><div class="flex-fill text-muted">no data</div></div>`
                        return `<div class="arrow_box">${html}</div>`
                    }
                    const v     = +((1 - d.bias_factor) * 100).toFixed(1)
                    const color = v > 0 ? successColor : v < 0 ? dangerColor : mutedColor
                    const sign  = v > 0 ? '+' : ''
                    let html = `<div class="text-center d-flex justify-content-between align-items-center" style="color: ${color}; padding: 4px;">`
                    html += `<span class="fw-bold">${m}</span></div>`
                    html += `<div class="f-b p-0 hstack gap-2"><div class="flex-fill">bias:</div><div class="text-end font-monospace" style="color:${color};">${sign}${v}%</div></div>`
                    html += `<div class="f-b p-0 hstack gap-2"><div class="flex-fill">projects:</div><div class="text-end font-monospace">${d.projects_count}</div></div>`
                    return `<div class="arrow_box">${html}</div>`
                }
            },
            series: [{
                type: 'bar',
                data: barData,
                markLine: {
                    silent: true,
                    symbol: 'none',
                    lineStyle: { color: 'rgba(255,255,255,0.2)', type: 'solid', width: 1 },
                    data: [{ yAxis: 0 }],
                    label: { show: false }
                }
            }]
        }
    }
}
