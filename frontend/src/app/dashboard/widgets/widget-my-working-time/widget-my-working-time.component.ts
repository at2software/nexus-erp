import { Component, inject, OnInit } from '@angular/core';
import { BaseWidgetComponent } from '../base.widget.component';
import { StatsService } from 'src/models/stats-service';
import { EChartsStackedBarOptions } from '@charts/ChartOptions';
import { GlobalService } from 'src/models/global.service';
import moment from 'moment';
import { Color } from 'src/constants/Color';
import { WidgetsModule } from '../widgets.module';
import { CommonModule } from '@angular/common';

@Component({
    selector: 'widget-my-working-time',
    templateUrl: './widget-my-working-time.component.html',
    styleUrls: ['./widget-my-working-time.component.scss', './../base.widget.component.scss'],
    standalone: true,
    imports: [WidgetsModule, CommonModule]
})
export class WidgetMyWorkingTimeComponent extends BaseWidgetComponent implements OnInit {
    stats = inject(StatsService)
    global = inject(GlobalService)
    data: any
    average: number
    averageSoll: number
    workThisWeek: number = 0
    requiredWorkThisWeek: number = 0
    chartOptions: any
    echartsInstance: any

    defaultOptions = () => ({})
    
    reload(): void {
        this.stats?.showMyWorkingTime().subscribe((response: any) => {
            const workInfo = response.workinfo ?? []

            // Append today if missing from workinfo but present in data
            const today = moment().format('YYYY-MM-DD')
            if (!workInfo.some((e: any) => e.key === today)) {
                const todayEntry = (response.data ?? []).find((e: any) => e.key === today)
                if (todayEntry) {
                    workInfo.push({
                        key: today,
                        day: moment().format('DD.MM.YYYY'),
                        value: Number(todayEntry.value ?? 0),
                        class: 'work-bar-default',
                        required: 8
                    })
                }
            }

            const dataOk: { x: string, y: number }[] = []
            const dataLow: { x: string, y: number }[] = []
            const dataVac: { x: string, y: number }[] = []

            workInfo.forEach((entry: any) => {
                const dayKey = entry.key ?? moment(entry.day, 'DD.MM.YYYY').format('YYYY-MM-DD')
                const value = Number(entry.value ?? 0)

                dataOk.push({ x: dayKey, y: entry.class === 'work-bar-default' ? value : 0 })
                dataLow.push({ x: dayKey, y: entry.class === 'work-bar-danger' ? value : 0 })
                dataVac.push({ x: dayKey, y: entry.class === 'work-bar-holiday' ? value : 0 })
            })

            // week progress
            this.workThisWeek = Number(response.work_this_week ?? 0)
            this.requiredWorkThisWeek = Number(response.required_work_this_week ?? 0)

            this.averageSoll = Number(response.required_hours ?? this.global.user?.getHpw() ?? 0)
            this.average = Number(response.average ?? 0)

            // Generate ECharts data directly
            const echartsData = [
                {
                    name: $localize`:@@i18n.hr.timeOk:time OK`,
                    type: 'bar' as const,
                    stack: 'time',
                    itemStyle: {
                        color: Color.fromVar('--color-primary-0', '').toHexString()
                    },
                    data: dataOk.map(d => [d.x, d.y])
                },
                {
                    name: $localize`:@@i18n.hr.timeNotEnought:nicht genug`,
                    type: 'bar' as const,
                    stack: 'time',
                    itemStyle: {
                        color: Color.fromVar('--color-danger', '').toHexString()
                    },
                    data: dataLow.map(d => [d.x, d.y])
                },
                {
                    name: $localize`:@@i18n.hr.timeVacationOrWeekend:vacation / weekend`,
                    type: 'bar' as const,
                    stack: 'time',
                    itemStyle: {
                        color: Color.fromVar('--color-cyan', '').toHexString()
                    },
                    data: dataVac.map(d => [d.x, d.y])
                }
            ]

            this.chartOptions = {
                ...EChartsStackedBarOptions,
                series: echartsData,
                tooltip: {
                    ...EChartsStackedBarOptions.tooltip,
                    formatter: (params: any) => {
                        if (!params || params.length === 0) return ''
                        
                        const date = moment(params[0].axisValue).format('YYYY-MM-DD')
                        let html = `<div style="font-weight: bold; margin-bottom: 8px;">${date}</div>`
                        
                        params.forEach((param: any) => {
                            if (param.value[1] > 0) {
                                const color = param.color
                                const value = param.value[1].toPrecision(2) + 'h'
                                html += `<div style="display: flex; justify-content: space-between; margin: 4px 0;">
                                    <span style="color: ${color};">${param.seriesName}</span>
                                    <span style="font-family: monospace;">${value}</span>
                                </div>`
                            }
                        })
                        return html
                    }
                }
            }

            if (this.echartsInstance) {
                this.echartsInstance.setOption(this.chartOptions, true)
            }
        })
    }

    onChartInit(ec: any) {
        this.echartsInstance = ec
    }
}
