import { Component, inject, OnInit, AfterViewInit } from '@angular/core';
import { NgbDateAdapter } from '@ng-bootstrap/ng-bootstrap';
import moment from 'moment';
import { ChartOptionsMinimal, ChartOptionsSparkline, annotate } from '@charts/ChartOptions';
import { NxGlobal } from '@app/nx/nx.global';
import { Color } from '@constants/Color';
import { Dictionary } from '@constants/constants';
import { deepCopy } from '@constants/deepClone';
import { deepMerge } from '@constants/deepMerge';
import { NgbDateCarbonAdapter } from '@directives/ngb-date.adapter';
import { StatsService } from '@models/stats-service';
import { forkJoin } from 'rxjs';
import { ShortPipe } from '../../../../pipes/short.pipe';
import { MoneyPipe } from '../../../../pipes/money.pipe';
import { ApxChartXComponent } from '@charts/apx-chart-x/apx-chart-x.component';

import { FormsModule } from '@angular/forms';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

interface TSvB {year:string, sum:number}

@Component({
    selector: 'projects-stats',
    templateUrl: './projects-stats.component.html',
    styleUrls: ['./projects-stats.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    standalone: true,
    imports: [ApxChartXComponent, FormsModule, NgxDaterangepickerMd, EmptyStateComponent]
})
export class ProjectsStatsComponent implements OnInit, AfterViewInit {

    data: any = {
        svb: undefined,
        quote_accuracy: undefined,
        project_success_duration: undefined,
        project_success_value: undefined,
    }
    isLoaded = false
    get hasData() { return this.data.svb?.series?.some((s: any) => s.data?.length > 0) }

    period: { startDate: any, endDate: any } = { startDate: moment().subtract(5, 'year'), endDate: moment() }

    stats = inject(StatsService)
    shortPipe = new ShortPipe()
    moneyPipe = new MoneyPipe()

    ngOnInit() {
        this.reloadProjectSuccessDuration()
        this.reloadProjectSuccessValue()
        this.stats?.showSvB().subscribe((data: {budget:TSvB[], support:TSvB[], direct:TSvB[]}) => {
            const normalizeSeries = (...seriesGroups: TSvB[][]): Record<string, any[]> => {
                const allYears = new Set<string>();
                seriesGroups.forEach(series => series.forEach(item => allYears.add(item.year)));
                const years = Array.from(allYears).sort()
                const result: Record<string, TSvB[]> = {}
                seriesGroups.forEach((series, index) => {
                    const name = ['budget', 'support', 'direct'][index]
                    const map = new Map(series.map(item => [item.year, item.sum]))
                    result[name] = years.map(year => ({ year, sum: map.get(year) ?? 0 }))
                })
                return result;
            }

            const mapTo = (svb:TSvB[]) => svb.map(_ => ({ x: _.year, y: _.sum }))
            const {budget, support, direct} = normalizeSeries(data.budget, data.support, data.direct)

            const series: Dictionary[] = [
                { name: 'Budget', data: mapTo(budget) },
                { name: 'Support', data: mapTo(support) },
                { name: 'Direct', data: mapTo(direct) },
            ]
            

            // Calculate max value from all series data
            const allValues = series.flat().map(s => s.data).flat().map(point => point.y).filter(val => val !== null && val !== undefined);
            const maxVal = Math.max(...allValues);
            
            // Add some padding to the max value (keep min at 0 for percentage charts)
            //const yMax = maxVal * 1.1;
            const colors = [Color.fromVar('cyan'), Color.fromVar('teal'), Color.fromVar('yellow')]
            this.data.svb = deepMerge(deepCopy(ChartOptionsMinimal), deepCopy(ChartOptionsSparkline), {
                chart: { height: 100, type: 'area', stacked: true, redrawOnWindowResize: true },
                colors: colors.map(_ => _.toHexString()),
                fill: {
                    type: 'solid',
                    colors: colors.map(_ => _.darken(30).toHexString()),
                    opacity: 1
                },
                series: series,
                tooltip: { shared: true, y: { formatter: this.moneyPipe.transform } },
                annotations: {
                    yaxis: [
                        annotate(maxVal, 0, this.shortPipe)
                    ]
                },
                yaxis: { min: 0, formatter: this.moneyPipe.transform },
                xaxis: { type: 'datetime' },
                stroke: { width: 2 },
            })
            this.isLoaded = true
        })
    }

    ngAfterViewInit() {
        this.reloadQuoteAccuracy()
    }

    reloadProjectSuccessDuration() {
        const ps3 = [
            this.stats.projectSuccessProbabilityCurve(),
            this.stats.projectSuccessProbabilityCurveOver(5),
            this.stats.projectSuccessProbabilityCurveOver(3),
        ]
        forkJoin(ps3).subscribe((response:any[]) => {
            // Calculate min and max values from all series data
            const allValues = response.flat().map(point => point.y).filter(val => val !== null && val !== undefined);
            const minVal = Math.min(...allValues);
            const maxVal = Math.max(...allValues);
            
            // Add some padding to the min/max values
            const padding = (maxVal - minVal) * 0.1;
            const yMin = Math.max(0, minVal - padding);
            const yMax = maxVal + padding;
            
            this.data.project_success_duration = deepMerge(deepCopy(ChartOptionsMinimal), deepCopy(ChartOptionsSparkline), {
                chart: { height: 100, type: 'line', redrawOnWindowResize: true },
                series: response.map((_, index:number) => ({
                    name: ['All time data', 'last 5 years data', 'last 3 years data'][index],
                    data: _
                })),
                tooltip: { shared: true },
                annotations: {
                    xaxis: [
                        { x: 365, borderColor: '#ffffff', opacity: .5, label: { text: '1Y', borderWidth:0, style: { color: '#fff', background: 'transparent' }, offsetY: -10 } },
                        { x: 365 * 2, borderColor: '#ffffff', opacity: .5, label: { text: '2Y', borderWidth:0, style: { color: '#fff', background: 'transparent' }, offsetY: -10 } },
                        { x: 365 * 3, borderColor: '#ffffff', opacity: .5, label: { text: '3Y', borderWidth:0, style: { color: '#fff', background: 'transparent' }, offsetY: -10 } },
                    ],
                    yaxis: [
                        annotate(minVal, 0, this.shortPipe),
                        annotate(maxVal, 0, this.shortPipe)
                    ]
                },
                yaxis: { 
                    min: yMin,
                    max: yMax,
                    labels: {
                        formatter: (val: number) => (val * 100).toFixed(0) + '%'
                    }
                 },
                xaxis: { 
                    max: 365 * 3,
                    labels: {
                        formatter: (val: number) => `${val} days`
                    }
                },
                stroke: { width: 2 },
            })
        })
    }
    reloadProjectSuccessValue() {
        const ps3 = [
            this.stats.projectSuccessProbabilityCurveValue(),
            this.stats.projectSuccessProbabilityCurveValueOver(5),
            this.stats.projectSuccessProbabilityCurveValueOver(3),
        ]
        forkJoin(ps3).subscribe((response:any[]) => {
            // Calculate min and max values from all series data
            const allValues = response.flat().map(point => point.y).filter(val => val !== null && val !== undefined);
            const minVal = Math.min(...allValues);
            const maxVal = Math.max(...allValues);
            
            // Add some padding to the min/max values
            const padding = (maxVal - minVal) * 0.1;
            const yMin = Math.max(0, minVal - padding);
            const yMax = maxVal + padding;
            
            this.data.project_success_value = deepMerge(deepCopy(ChartOptionsMinimal), deepCopy(ChartOptionsSparkline), {
                chart: { height: 100, type: 'line', redrawOnWindowResize: true },
                series: response.map((_, index:number) => ({
                    name: ['All time data', 'last 5 years data', 'last 3 years data'][index],
                    data: _
                })),
                tooltip: { shared: true },
                annotations: {
                    yaxis: [
                        annotate(minVal, 0, this.shortPipe),
                        annotate(maxVal, 0, this.shortPipe)
                    ]
                },
                yaxis: { 
                    min: yMin,
                    max: yMax,
                    labels: {
                        formatter: (val: number) => (val * 100).toFixed(0) + '%'
                    }
                 },
                xaxis: { 
                    logarithmic: true,
                    labels: { formatter: (val: number) => `${val} EUR` }
                },
                stroke: { width: 2 },
            })
        })
    }
    reloadQuoteAccuracy() {
        const p = { startDate: this.period.startDate, endDate: this.period.endDate }
        this.stats.showQuoteAccuracy(p).subscribe(data => {
            data.sort((a, b) => a.net - b.net)
            const c = deepMerge(deepCopy(ChartOptionsMinimal), {
                chart: { height: 300, redrawOnWindowResize: true, type: 'rangeArea' },
                series: [
                    {
                        type: 'rangeArea',
                        data: data.map(_ => ({
                            x: _.net,
                            //y: [Math.round(_.min), Math.round(_.max)]
                            y: [Math.round(_.average - _.stddev), Math.round(_.average + _.stddev)]
                        })),
                        color: Color.fromVar('--color-primary-0', '').darken(30).toHexString()
                    },
                    {
                        type: 'line',
                        data: data.map(_ => ({
                            x: _.net,
                            y: _.average
                        })),
                        color: Color.fromVar('--color-primary-0', '').toHexString()
                    },
                ],
                yaxis: {
                    min: 0,
                    max: 400,
                    labels: {
                        formatter: (val: number) => Math.floor(val) + '%'
                    },
                    show: true
                },
                xaxis: {
                    show: true,
                    labels: {
                        formatter: (val: number) => '> ' + Math.floor(Math.pow(10, val / 2)) + ' ' + NxGlobal.global.currencySymbol()
                    }
                },
                annotations: {
                    yaxis: [
                        { y: 100, borderColor: '#ffffff', opacity: .5, },
                        { y: 200, borderColor: Color.fromVar('--color-warning', '').toHexString(), opacity: .5, },
                        { y: 300, borderColor: Color.fromVar('--color-danger', '').toHexString(), opacity: .5, },
                    ]
                },
                stroke: { width: 2 },
            })
            this.data.quote_accuracy = c
        })
    }
    onSvbStackedToggle() {
        this.data.svb.chart = { ...this.data.svb.chart, stacked: !this.data.svb.chart?.stacked };
        this.data.svb.fill.opacity = this.data.svb.chart?.stacked ? 1 : 0
        this.data.svb = { ...this.data.svb }; // Trigger change detection
    }
}
