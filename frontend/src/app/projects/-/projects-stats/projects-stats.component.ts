import { ChangeDetectionStrategy, Component, inject, OnInit, AfterViewInit } from '@angular/core';
import { NgbDateAdapter } from '@ng-bootstrap/ng-bootstrap';
import moment from 'moment';
import { ECHARTS_DEFAULT_TOOLTIP_OPTIONS, eAnnotateX, eAnnotateY } from '@charts/echarts-presets';
import { NxGlobal } from '@app/nx/nx.global';
import { Color } from '@constants/Color';
import { Dictionary } from '@constants/constants';
import { NgbDateCarbonAdapter } from '@directives/ngb-date.adapter';
import { StatsService } from '@models/stats-service';
import { forkJoin } from 'rxjs';
import { ShortPipe } from '@pipes/short.pipe';
import { MoneyPipe } from '@pipes/money.pipe';
import { EchartsComponent } from '@charts/echarts-wrapper/echarts-wrapper.component';

import { FormsModule } from '@angular/forms';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

interface TSvB {
    year: string;
    sum: number;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'projects-stats',
    templateUrl: './projects-stats.component.html',
    styleUrls: ['./projects-stats.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    standalone: true,
    imports: [EchartsComponent, FormsModule, NgxDaterangepickerMd, EmptyStateComponent],
})
export class ProjectsStatsComponent implements OnInit, AfterViewInit {
    data: any = {
        svb: undefined,
        quote_accuracy: undefined,
        project_success_duration: undefined,
        project_success_value: undefined,
    };
    isLoaded = false;
    get hasData() {
        return this.data.svb?.series?.some((s: any) => s.data?.length > 0);
    }

    period: { startDate: any; endDate: any } = { startDate: moment().subtract(5, 'year'), endDate: moment() };

    stats = inject(StatsService);
    shortPipe = new ShortPipe();
    moneyPipe = new MoneyPipe();

    ngOnInit() {
        this.reloadProjectSuccessDuration();
        this.reloadProjectSuccessValue();
        this.stats?.showSvB().subscribe((data: { budget: TSvB[]; support: TSvB[]; direct: TSvB[] }) => {
            const normalizeSeries = (...seriesGroups: TSvB[][]): Record<string, any[]> => {
                const allYears = new Set<string>();
                seriesGroups.forEach((series) => series.forEach((item) => allYears.add(item.year)));
                const years = Array.from(allYears).sort();
                const result: Record<string, TSvB[]> = {};
                seriesGroups.forEach((series, index) => {
                    const name = ['budget', 'support', 'direct'][index];
                    const map = new Map(series.map((item) => [item.year, item.sum]));
                    result[name] = years.map((year) => ({ year, sum: map.get(year) ?? 0 }));
                });
                return result;
            };

            const mapTo = (svb: TSvB[]) => svb.map((_) => ({ x: _.year, y: _.sum }));
            const { budget, support, direct } = normalizeSeries(data.budget, data.support, data.direct);

            const series: Dictionary[] = [
                { name: 'Budget', data: mapTo(budget) },
                { name: 'Support', data: mapTo(support) },
                { name: 'Direct', data: mapTo(direct) },
            ];

            // Calculate max value from all series data
            const allValues = series
                .flat()
                .map((s) => s.data)
                .flat()
                .map((point) => point.y)
                .filter((val) => val !== null && val !== undefined);
            const maxVal = Math.max(...allValues);

            // Add some padding to the max value (keep min at 0 for percentage charts)
            //const yMax = maxVal * 1.1;
            const colors = [Color.fromVar('cyan'), Color.fromVar('teal'), Color.fromVar('yellow')];
            const isStacked = true;
            this.data.svb = {
                chart: { height: 100, stacked: isStacked },
                backgroundColor: 'transparent',
                animation: false,
                grid: { left: 0, right: 0, top: 0, bottom: 0 },
                xAxis: { type: 'time', show: false },
                yAxis: { type: 'value', show: false, min: 0 },
                tooltip: {
                    trigger: 'axis',
                    ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS,
                    formatter: (params: any[]) => params.map((p: any) => `<span style="color:${p.color}">●</span> ${p.seriesName}: ${this.moneyPipe.transform(p.value[1])}`).join('<br>'),
                },
                series: series.map((s, i) => ({
                    name: s.name,
                    type: 'line',
                    stack: 'total',
                    symbol: 'none',
                    lineStyle: { width: 2, color: colors[i].toHexString() },
                    itemStyle: { color: colors[i].toHexString() },
                    areaStyle: { color: colors[i].darken(30).toHexString(), opacity: 1 },
                    data: (s.data as any[]).map((p: any) => [p.x, p.y]),
                    ...(i === 0 ? { markLine: { silent: true, symbol: 'none', data: [eAnnotateY(maxVal, this.shortPipe)] } } : {}),
                })),
            };
            this.isLoaded = true;
        });
    }

    ngAfterViewInit() {
        this.reloadQuoteAccuracy();
    }

    reloadProjectSuccessDuration() {
        const ps3 = [this.stats.projectSuccessProbabilityCurve(), this.stats.projectSuccessProbabilityCurveOver(5), this.stats.projectSuccessProbabilityCurveOver(3)];
        forkJoin(ps3).subscribe((response: any[]) => {
            // Calculate min and max values from all series data
            const allValues = response
                .flat()
                .map((point) => point.y)
                .filter((val) => val !== null && val !== undefined);
            const minVal = Math.min(...allValues);
            const maxVal = Math.max(...allValues);

            // Add some padding to the min/max values
            const padding = (maxVal - minVal) * 0.1;
            const yMin = Math.max(0, minVal - padding);
            const yMax = maxVal + padding;

            this.data.project_success_duration = {
                chart: { height: 100 },
                backgroundColor: 'transparent',
                animation: false,
                grid: { left: 0, right: 0, top: 0, bottom: 0 },
                xAxis: { type: 'value', show: false, max: 365 * 3 },
                yAxis: { type: 'value', show: false, min: yMin, max: yMax },
                tooltip: { trigger: 'axis', ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS, formatter: (params: any[]) => params.map((p: any) => `${p.seriesName}: ${(p.value[1] * 100).toFixed(0)}%`).join('<br>') },
                series: response.map((_: any, index: number) => ({
                    name: ['All time data', 'last 5 years data', 'last 3 years data'][index],
                    type: 'line',
                    symbol: 'none',
                    lineStyle: { width: 2 },
                    data: _.map((p: any) => [p.x, p.y]),
                    ...(index === 0
                        ? {
                              markLine: {
                                  silent: true,
                                  symbol: 'none',
                                  data: [eAnnotateX(365, '1Y'), eAnnotateX(365 * 2, '2Y'), eAnnotateX(365 * 3, '3Y'), eAnnotateY(minVal, this.shortPipe), eAnnotateY(maxVal, this.shortPipe)],
                              },
                          }
                        : {}),
                })),
            };
        });
    }
    reloadProjectSuccessValue() {
        const ps3 = [this.stats.projectSuccessProbabilityCurveValue(), this.stats.projectSuccessProbabilityCurveValueOver(5), this.stats.projectSuccessProbabilityCurveValueOver(3)];
        forkJoin(ps3).subscribe((response: any[]) => {
            // Calculate min and max values from all series data
            const allValues = response
                .flat()
                .map((point) => point.y)
                .filter((val) => val !== null && val !== undefined);
            const minVal = Math.min(...allValues);
            const maxVal = Math.max(...allValues);

            // Add some padding to the min/max values
            const padding = (maxVal - minVal) * 0.1;
            const yMin = Math.max(0, minVal - padding);
            const yMax = maxVal + padding;

            this.data.project_success_value = {
                chart: { height: 100 },
                backgroundColor: 'transparent',
                animation: false,
                grid: { left: 0, right: 0, top: 0, bottom: 0 },
                xAxis: { type: 'log', show: false },
                yAxis: { type: 'value', show: false, min: yMin, max: yMax },
                tooltip: { trigger: 'axis', ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS, formatter: (params: any[]) => params.map((p: any) => `${p.seriesName}: ${(p.value[1] * 100).toFixed(0)}%`).join('<br>') },
                series: response.map((_: any, index: number) => ({
                    name: ['All time data', 'last 5 years data', 'last 3 years data'][index],
                    type: 'line',
                    symbol: 'none',
                    lineStyle: { width: 2 },
                    data: _.map((p: any) => [p.x, p.y]),
                    ...(index === 0
                        ? {
                              markLine: {
                                  silent: true,
                                  symbol: 'none',
                                  data: [eAnnotateY(minVal, this.shortPipe), eAnnotateY(maxVal, this.shortPipe)],
                              },
                          }
                        : {}),
                })),
            };
        });
    }
    reloadQuoteAccuracy() {
        const p = { startDate: this.period.startDate, endDate: this.period.endDate };
        this.stats.showQuoteAccuracy(p).subscribe((data) => {
            data.sort((a: any, b: any) => a.net - b.net);
            const rangeColor = Color.fromVar('--color-primary-0', '').darken(30).toHexString();
            const lineColor = Color.fromVar('--color-primary-0', '').toHexString();
            const warnColor = Color.fromVar('--color-warning', '').toHexString();
            const dangerColor = Color.fromVar('--color-danger', '').toHexString();
            this.data.quote_accuracy = {
                chart: { height: 300 },
                backgroundColor: 'transparent',
                animation: false,
                grid: { left: 40, right: 10, top: 10, bottom: 30, containLabel: false },
                xAxis: { type: 'value', show: true, axisLabel: { formatter: (val: number) => '>' + Math.floor(Math.pow(10, val / 2)) + ' ' + NxGlobal.global.currencySymbol() } },
                yAxis: { type: 'value', show: true, min: 0, max: 400, axisLabel: { formatter: (val: number) => Math.floor(val) + '%' } },
                tooltip: { trigger: 'axis', ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS },
                series: [
                    {
                        name: 'lower',
                        type: 'line',
                        symbol: 'none',
                        stack: 'band',
                        data: data.map((_: any) => [_.net, Math.round(_.average - _.stddev)]),
                        lineStyle: { opacity: 0 },
                        itemStyle: { opacity: 0 },
                        areaStyle: { color: 'transparent', opacity: 0 },
                        tooltip: { show: false },
                    },
                    {
                        name: 'range',
                        type: 'line',
                        symbol: 'none',
                        stack: 'band',
                        data: data.map((_: any) => [_.net, Math.round(_.average + _.stddev) - Math.round(_.average - _.stddev)]),
                        lineStyle: { opacity: 0 },
                        itemStyle: { color: rangeColor },
                        areaStyle: { color: rangeColor, opacity: 0.5 },
                        tooltip: { show: false },
                    },
                    {
                        name: 'average',
                        type: 'line',
                        symbol: 'none',
                        data: data.map((_: any) => [_.net, _.average]),
                        lineStyle: { width: 2, color: lineColor },
                        itemStyle: { color: lineColor },
                        markLine: {
                            silent: true,
                            symbol: 'none',
                            data: [
                                { yAxis: 100, lineStyle: { color: '#ffffff80', type: 'dashed', width: 1 }, label: { show: false } },
                                { yAxis: 200, lineStyle: { color: warnColor, type: 'dashed', width: 1 }, label: { show: false } },
                                { yAxis: 300, lineStyle: { color: dangerColor, type: 'dashed', width: 1 }, label: { show: false } },
                            ],
                        },
                    },
                ],
            };
        });
    }
    onSvbStackedToggle() {
        const stacked = !this.data.svb.chart?.stacked;
        this.data.svb = {
            ...this.data.svb,
            chart: { ...this.data.svb.chart, stacked },
            series: this.data.svb.series.map((s: any) => ({ ...s, stack: stacked ? 'total' : undefined, areaStyle: stacked ? s.areaStyle : undefined })),
        };
    }
}
