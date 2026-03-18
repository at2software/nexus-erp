import { Component, inject, OnDestroy, OnInit } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { Subject } from 'rxjs';
import { deepCopy } from 'src/constants/deepClone';
import moment from 'moment';
import { CASHFLOW_CHART_I18N, CASHFLOW_CHART_KEYS, CASHFLOW_I18N, EXPENSE_KEY, CASHFLOW_CHART_CHARTS } from './widget-cashflow.options';
import { Color } from 'src/constants/Color';
import { EChartsSimpleOptions } from '@charts/ChartOptions';
import { OptionType } from '../widget-options/widget-options.component';
import { MoneyPipe } from 'src/pipes/money.pipe';
import { WidgetsModule } from '../widgets.module';
import { ParamService } from '@models/param.service';

@Component({
    selector: 'widget-cashflow',
    templateUrl: './widget-cashflow.component.html',
    styleUrls: ['./widget-cashflow.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule]
})
export class WidgetCashflowComponent extends BaseWidgetComponent implements OnDestroy, OnInit {


    mshort = new MoneyPipe()
    shortPipe = this.mshort
    chartOptions: any = {}    
    echartsInstance: any

    #destroy$ = new Subject<void>()
    #paramService = inject(ParamService)

    filteredKeys = () => CASHFLOW_CHART_KEYS.filter(_ => (this.options && _ in this.options) ? this.options[_].value : [])
    defaultOptions = () => {
        const ret:Record<string, any> = {}
        CASHFLOW_CHART_KEYS.forEach(_ => ret[_] = { type:OptionType.Boolean, value:true, i18n: CASHFLOW_CHART_I18N[_] })
        return ret
    }    
    ngOnInit() {
        super.ngOnInit()
        this.initChartOptions()
        this.reload()
    }
    ngOnDestroy() {
        this.#destroy$.next()
        this.#destroy$.complete()
    }
    reload() {
        if (!this.hasInvoicesExpenses) {
            return;
        }
        const positionOf = (_:any) => CASHFLOW_CHART_KEYS.findIndex((x:any) => x.name == _)
        //this.filteredKeys().forEach(key => promises.push(this.#persistentStats.statsFor('params/' + key)))
        this.#paramService.history('params/' + this.filteredKeys().join(','), moment().startOf('month').subtract(36, "month").unix(), 'month').subscribe((result:any[]) => {
            const maxVal:Record<string, number> = {}
            
            // Generate ECharts series directly
            const echartsData = deepCopy(result)
                .sort((a, b) => positionOf(b) - positionOf(a))
                .map((_, index) => {
                    if (!_ || !('data' in _)) return null
                    
                    // Process data points
                    const processedData = _['data'].map((point: any) => {
                        if (!(point.x in maxVal)) maxVal[point.x] = 0
                        if (_['name'] != EXPENSE_KEY) {
                            maxVal[point.x] += point.y
                        }
                        return [point.x, point.y]
                    })
                    
                    // Fill missing months with zeros
                    for (let i = moment().subtract(3, 'year').startOf('month').subtract(1, 'month'); i < moment().startOf('month'); i.add(1, 'month')) {
                        const monthString = i.format('YYYY-MM-01')
                        if (!processedData.find((point: any) => point[0] == monthString)) {
                            processedData.push([monthString, 0])
                        }
                    }
                    
                    // Sort by date
                    processedData.sort((a: any, b: any) => a[0] && b[0] ? a[0].localeCompare(b[0]) : 0)
                    
                    const isExpenseLine = _['name'] === EXPENSE_KEY
                    const seriesName = CASHFLOW_I18N(_['name'])
                    
                    if (isExpenseLine) {
                        return {
                            name: seriesName,
                            type: 'line' as const,
                            symbol: 'none',
                            lineStyle: {
                                width: 2,
                                type: 'dashed' as const,
                                color: this.#getSeriesColor(seriesName, index)
                            },
                            itemStyle: {
                                color: this.#getSeriesColor(seriesName, index)
                            },
                            data: processedData,
                            smooth: false
                        }
                    } else {
                        return {
                            name: seriesName,
                            type: 'line' as const,
                            stack: 'cashflow',
                            symbol: 'none',
                            areaStyle: {
                                color: this.#getSeriesColor(seriesName, index, 25),
                                opacity: 1
                            },
                            lineStyle: {
                                width: 2,
                                color: this.#getSeriesColor(seriesName, index)
                            },
                            itemStyle: {
                                color: this.#getSeriesColor(seriesName, index)
                            },
                            data: processedData,
                            smooth: false
                        }
                    }
                })
                .filter(series => series !== null)
            
            const max = Math.max(...Object.values(maxVal))
            this.value = Object.values(maxVal)[Object.values(maxVal).length - 1]
            
            // Update chart options directly
            this.chartOptions = {
                ...this.chartOptions,
                series: echartsData,
                yAxis: {
                    ...this.chartOptions.yAxis,
                    max: Math.ceil(max * 1.2)
                }
            }
            
            if (this.echartsInstance) {
                this.echartsInstance.setOption(this.chartOptions, true)
            }
        })
    }

    initChartOptions() {
        this.chartOptions = {
            ...EChartsSimpleOptions,
            series: [],
            tooltip: {
                ...EChartsSimpleOptions.tooltip,
                formatter: (params: any) => this.formatTooltip(params)
            }
        }
    }


    #getSeriesColor(seriesName: string, index: number, darkenAmount: number = 0): string {
        // Find the key that matches this series name
        const chartKey = Object.keys(CASHFLOW_CHART_I18N).find(key => 
            CASHFLOW_CHART_I18N[key] === seriesName
        )
        
        if (chartKey && CASHFLOW_CHART_CHARTS[chartKey]) {
            const color = Color.fromVar(CASHFLOW_CHART_CHARTS[chartKey])
            return darkenAmount > 0 ? color.darken(darkenAmount).toHexString() : color.toHexString()
        }
        
        // Fallback color
        const lightness = darkenAmount > 0 ? 35 : 50
        return `hsl(${index * 40}, 70%, ${lightness}%)`
    }

    formatTooltip(params: any): string {
        if (!params || params.length === 0) return ''
        
        const date = new Date(params[0].axisValue).toISOString().split('T')[0]
        let html = `<div style="font-weight: bold; margin-bottom: 8px;">${date}</div>`
        
        let sum = 0
        let items = ''
        
        params.forEach((param: any) => {
            if (param.seriesName !== CASHFLOW_I18N(EXPENSE_KEY)) {
                sum += param.value[1]
            }
            if (param.value[1] > 0) {
                const color = param.color
                const value = this.mshort.transform(param.value[1])
                items += `<div class="hstack gap-2">
                    <span class="flex-fill" style="color: ${color};">${param.seriesName}</span>
                    <span class="text-end" style="font-family: monospace;">${value}</span>
                </div>`
            }
        })
        
        html += items
        const totalValue = this.mshort.transform(sum)
        html += `<div class="hstack gap-2" style="margin-top: 8px; border-top: 1px solid #666; padding-top: 4px;">
            <span class="flex-fill">∑</span>
            <span class="text-end" style="font-family: monospace;">${totalValue}</span>
        </div>`
        
        return html
    }

    onChartInit(ec: any) {
        this.echartsInstance = ec
    }
}