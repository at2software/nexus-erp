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
    VARIANCE = .95
    ngOnInit() {
        this.reload()
    }
    defaultOptions = () => ({})
    reload(): void {
        this.stats?.showMyWorkingTime().subscribe((response: any) => {
            const vacationMap = (v: any) => {
                const day = moment(v.started_at)
                const end = moment(v.ended_at)
                const r = []
                while (day <= end) {
                    r.push(day.format('YYYY-MM-DD'))
                    day.add(1, 'day')
                }
                return r
            }
            const parseDay = (day: moment.Moment) => {
                const dayString = day.format('YYYY-MM-DD')
                const isVacation = vacationDays.includes(dayString) || response.holidays.includes(dayString) || day.day() === 0 || day.day() === 6
                const workInfo = findDay(dayString, data)
                const reqHoursToday = hpw[(day.day() + 6) % 7]
                return [dayString, isVacation, workInfo, reqHoursToday]
            }
            const findDay = (day: string, array: any[]) => array.find(_ => _.key === day)
            const data: any[] = response.data
            const earliest = moment.min(data.map(_ => moment(_.key)))
            let currentDay = earliest.clone()
            const set = [
                ...response.vacation_start.map((_: any) => vacationMap(_)),
                ...response.vacation_end.map((_: any) => vacationMap(_))
            ]
            const vacationDays = [...new Set(set.flattened())]
            const dataOk = []
            const dataLow = []
            const dataVac = []
            let workingHoursTotal = 0
            let requiredHoursTotal = 0
            const hpw = this.global.user?.getHpwArray() ?? [0, 0, 0, 0, 0, 0, 0]
            while (currentDay < moment().startOf('day')) {
                const [dayString, isVacation, workInfo, reqHoursToday] = parseDay(currentDay)
                const nodeOk = { x: dayString, y: 0 }
                const nodeLow = { x: dayString, y: 0 }
                const nodeVac = { x: dayString, y: 0 }
                dataOk.push(nodeOk)
                dataLow.push(nodeLow)
                dataVac.push(nodeVac)
                if (workInfo) {
                    let ptr = nodeLow
                    if (reqHoursToday * this.VARIANCE <= workInfo.value) ptr = nodeOk
                    if (isVacation) ptr = nodeVac
                    workingHoursTotal += workInfo.value
                    ptr.y = workInfo.value
                }
                if (!isVacation) {
                    requiredHoursTotal += reqHoursToday
                }
                currentDay.add(1, 'day')
            }

            // week progress
            this.workThisWeek = 0
            this.requiredWorkThisWeek = 0
            currentDay = moment().startOf('week')
            while (currentDay < moment().endOf('week')) {
                const [, isVacation, workInfo, reqHoursToday] = parseDay(currentDay)
                if (workInfo) {
                    this.workThisWeek += workInfo.value
                }
                if (!isVacation) {
                    this.requiredWorkThisWeek += reqHoursToday
                }
                currentDay.add(1, 'day')
            }

            // add current day (but except it from stats)
            const today = moment()
            const [dayString, , workInfo, ] = parseDay(today)
            if (workInfo) {
                dataOk.push({ x: dayString, y: workInfo.value })
                dataLow.push({ x: dayString, y: 0 })
                dataVac.push({ x: dayString, y: 0 })
            }

            this.averageSoll = this.global.user?.getHpw() ?? 0
            this.average = this.averageSoll * workingHoursTotal / requiredHoursTotal

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
                        
                        const date = new Date(params[0].axisValue).toISOString().split('T')[0]
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
