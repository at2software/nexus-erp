import { Dictionary } from '@constants/constants';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NgbDateAdapter, NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { dayjs, Dayjs } from '@constants/dates';
import { ECHARTS_DEFAULT_TOOLTIP_OPTIONS, ECHARTS_DONUT_ITEM_STYLE, eAnnotateY } from '@charts/echarts-presets';
import { NxGlobal } from '@app/nx/nx.global';
import { Color } from '@constants/Color';
import { NgbDateCarbonAdapter } from '@directives/ngb-date.adapter';
import { StatsService } from '@models/stats-service';
import { forkJoin } from 'rxjs';
import { ShortPipe } from '@pipes/short.pipe';
import { MoneyPipe } from '@pipes/money.pipe';
import { EchartsComponent } from '@charts/echarts-wrapper/echarts-wrapper.component';

import { FormsModule } from '@angular/forms';
import { DaterangepickerDirective, NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { NComponent } from '@shards/n/n.component';
import { MlReliabilityDirective } from '@directives/ml-reliability.directive';
import { TimeValuePoint, XYPoint, TooltipParams, StatsData, ProjectProductMixResponse, ProjectSuccessRateResponse } from '@models/api-response';

type TimePeriod = NonNullable<DaterangepickerDirective['value']>;

type QuoteAcceptanceSignal = 'item_count' | 'net' | 'discount_pct' | 'prefix_length' | 'days_pending' | 'company_acceptance_rate' | 'company_prior_decided_count';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'projects-stats',
    templateUrl: './projects-stats.component.html',
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    imports: [EchartsComponent, FormsModule, NgxDaterangepickerMd, EmptyStateComponent, ToolbarComponent, NgbTooltipModule, NgbDropdownModule, NComponent, MlReliabilityDirective],
})
export class ProjectsStatsComponent {
    data = signal<StatsData>({
        svb: undefined,
        quote_accuracy: undefined,
        quote_acceptance_signal: undefined,
        product_mix: undefined,
        revenue_by_group: undefined,
        finished_timeline: undefined,
        success_rate: undefined,
    });
    isLoaded = signal(false);
    hasData = computed(() => this.data().svb?.series?.some((s) => (s.data?.length ?? 0) > 0) ?? false);

    mixPeriod = signal<TimePeriod>({ startDate: dayjs('2000-01-01'), endDate: dayjs() });
    readonly mixRanges = {
        'This year': [dayjs().startOf('year'), dayjs().endOf('year')],
        'Last year': [dayjs().subtract(1, 'year').startOf('year'), dayjs().subtract(1, 'year').endOf('year')],
        'Last 3 years': [dayjs().subtract(3, 'year'), dayjs()],
        'Last 5 years': [dayjs().subtract(5, 'year'), dayjs()],
        All: [dayjs('2000-01-01'), dayjs()],
    } satisfies Record<string, [Dayjs, Dayjs]>;

    stats = inject(StatsService);
    shortPipe = new ShortPipe();
    moneyPipe = new MoneyPipe();

    timelineMode = signal<'count' | 'net'>('count');
    #lastMix?: ProjectProductMixResponse;
    #lastGroupMeta?: Map<string, { name: string; color: string }>;

    quoteSignal = signal<QuoteAcceptanceSignal>('days_pending');
    readonly quoteSignalOptions: { key: QuoteAcceptanceSignal; label: string; format: (v: number) => string }[] = [
        { key: 'days_pending', label: $localize`:@@i18n.projects.signalDaysPending:decision duration`, format: (v) => `${Math.round(v)}d` },
        { key: 'net', label: $localize`:@@i18n.projects.signalNet:quote value`, format: (v) => this.moneyPipe.transform(v) ?? '' },
        { key: 'item_count', label: $localize`:@@i18n.projects.signalItemCount:item count`, format: (v) => `${Math.round(v)}` },
        { key: 'discount_pct', label: $localize`:@@i18n.projects.signalDiscountPct:discount`, format: (v) => `${v.toFixed(1)}%` },
        { key: 'prefix_length', label: $localize`:@@i18n.projects.signalPrefixLength:prefix length`, format: (v) => `${Math.round(v)}` },
        { key: 'company_acceptance_rate', label: $localize`:@@i18n.projects.signalCompanyAcceptanceRate:customer acceptance rate`, format: (v) => `${(v * 100).toFixed(0)}%` },
        { key: 'company_prior_decided_count', label: $localize`:@@i18n.projects.signalCompanyPriorDecidedCount:customer quote history`, format: (v) => `${Math.round(v)}` },
    ];
    quoteSignalLabel = computed(() => this.quoteSignalOptions.find((o) => o.key === this.quoteSignal())?.label ?? '');

    constructor() {
        this.reloadQuoteAcceptanceSignal();
        this.reloadAll();
        this.stats?.showSvB().subscribe((data: { budget: TimeValuePoint[]; support: TimeValuePoint[]; direct: TimeValuePoint[] }) => {
            const normalizeSeries = (...seriesGroups: TimeValuePoint[][]): Dictionary<any[]> => {
                const allYears = new Set<string>();
                seriesGroups.forEach((series) => series.forEach((item) => allYears.add(item.period)));
                const years = Array.from(allYears).sort();
                const result: Dictionary<TimeValuePoint[]> = {};
                seriesGroups.forEach((series, index) => {
                    const name = ['budget', 'support', 'direct'][index];
                    const map = new Map(series.map((item) => [item.period, item.value]));
                    result[name] = years.map((period) => ({ period, value: map.get(period) ?? 0 }));
                });
                return result;
            };

            const mapTo = (svb: TimeValuePoint[]) => svb.map((_) => ({ x: _.period, y: _.value }));
            const { budget, support, direct } = normalizeSeries(data.budget, data.support, data.direct);

            const series: { name: string; data: { x: string; y: number }[] }[] = [
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
            this.data.update((data) => ({
                ...data,
                svb: {
                    chart: { height: 100, stacked: isStacked },
                    backgroundColor: 'transparent',
                    animation: false,
                    grid: { left: 0, right: 0, top: 0, bottom: 0 },
                    xAxis: { type: 'time', show: false },
                    yAxis: { type: 'value', show: false, min: 0 },
                    tooltip: {
                        trigger: 'axis',
                        ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS,
                        formatter: (params: TooltipParams[]) => {
                            const date = params[0] ? dayjs(params[0].value[0]).format('MMM YYYY') : '';
                            const rows = params.map((p) => `<span style="color:${p.color}">●</span> ${p.seriesName}: ${this.moneyPipe.transform(p.value[1])}`).join('<br>');
                            return `${date}<br>${rows}`;
                        },
                    },
                    series: series.map((s, i) => ({
                        name: s.name,
                        type: 'line',
                        stack: 'total',
                        symbol: 'none',
                        lineStyle: { width: 2, color: colors[i].toHexString() },
                        itemStyle: { color: colors[i].toHexString() },
                        areaStyle: { color: colors[i].darken(30).toHexString(), opacity: 1 },
                        data: s.data.map((p) => [(p as XYPoint).x, (p as XYPoint).y]),
                        ...(i === 0 ? { markLine: { silent: true, symbol: 'none', data: [eAnnotateY(maxVal, this.shortPipe)] } } : {}),
                    })),
                },
            }));
            this.isLoaded.set(true);
        });
    }

    reloadAll() {
        this.reloadProductMix();
        this.reloadQuoteAccuracy();
    }

    selectQuoteSignal(key: QuoteAcceptanceSignal) {
        this.quoteSignal.set(key);
        this.reloadQuoteAcceptanceSignal();
    }
    reloadQuoteAcceptanceSignal() {
        const signal = this.quoteSignal();
        const option = this.quoteSignalOptions.find((o) => o.key === signal)!;
        this.stats.quoteAcceptanceSignalCurve(signal).subscribe((response) => {
            const points = response.points;
            const format = option.format;
            const primaryColor = Color.fromVar('--color-primary-0', '').toHexString();
            this.data.update((data) => ({
                ...data,
                quote_acceptance_signal: {
                    chart: { height: 220 },
                    backgroundColor: 'transparent',
                    animation: false,
                    grid: { left: 45, right: 15, top: 15, bottom: 30 },
                    xAxis: {
                        type: signal === 'net' ? 'log' : 'value',
                        axisLabel: { formatter: (val: number) => format(val) },
                    },
                    yAxis: { type: 'value', min: 0, max: 1, axisLabel: { formatter: (val: number) => `${Math.round(val * 100)}%` } },
                    tooltip: {
                        trigger: 'axis',
                        ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS,
                        formatter: (params: TooltipParams[]) => {
                            const p = params[0];
                            if (!p) return '';
                            const count = points.find((pt) => pt.x === p.value[0])?.count ?? 0;
                            return `${format(p.value[0] as number)}<br>${(p.value[1] * 100).toFixed(1)}% (n=${count})`;
                        },
                    },
                    series: [
                        {
                            name: option.label,
                            type: 'line',
                            symbol: 'circle',
                            symbolSize: 6,
                            lineStyle: { width: 2, color: primaryColor },
                            itemStyle: { color: primaryColor },
                            data: points.map((p) => [p.x, p.y]),
                        },
                    ],
                },
            }));
        });
    }
    reloadQuoteAccuracy() {
        const mp = this.mixPeriod();
        const p = { startDate: mp.startDate.format('YYYY-MM-DD'), endDate: mp.endDate.format('YYYY-MM-DD') };
        this.stats.showQuoteAccuracy(p).subscribe((data) => {
            data.sort((a, b) => a.net - b.net);
            const rangeColor = Color.fromVar('--color-primary-0', '').darken(30).toHexString();
            const lineColor = Color.fromVar('--color-primary-0', '').toHexString();
            const warnColor = Color.fromVar('--color-warning', '').toHexString();
            const dangerColor = Color.fromVar('--color-danger', '').toHexString();
            this.data.update((current) => ({
                ...current,
                quote_accuracy: {
                    chart: { height: 300 },
                    backgroundColor: 'transparent',
                    animation: false,
                    grid: { left: 40, right: 10, top: 10, bottom: 30, containLabel: false },
                    xAxis: { type: 'value', show: true, splitLine: { show: false }, axisLabel: { formatter: (val: number) => '>' + Math.floor(Math.pow(10, val / 2)) + ' ' + NxGlobal.global.currencySymbol() } },
                    yAxis: { type: 'value', show: true, splitLine: { show: false }, min: 0, max: 400, axisLabel: { formatter: (val: number) => Math.floor(val) + '%' } },
                    tooltip: {
                        trigger: 'axis',
                        ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS,
                        formatter: (params: TooltipParams[]) => {
                            const p = params[0];
                            if (!p) return '';
                            const net = Math.pow(10, (p.value[0] as number) / 2);
                            return `> ${this.moneyPipe.transform(net)}<br>${p.seriesName}: ${p.value[1]}%`;
                        },
                    },
                    series: [
                        {
                            name: 'lower',
                            type: 'line',
                            symbol: 'none',
                            stack: 'band',
                            data: data.map((_) => [_.net, Math.round(_.average - _.stddev)]),
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
                            data: data.map((_) => [_.net, Math.round(_.average + _.stddev) - Math.round(_.average - _.stddev)]),
                            lineStyle: { opacity: 0 },
                            itemStyle: { color: rangeColor },
                            areaStyle: { color: rangeColor, opacity: 0.5 },
                            tooltip: { show: false },
                        },
                        {
                            name: 'average',
                            type: 'line',
                            symbol: 'none',
                            data: data.map((_) => [_.net, _.average]),
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
                },
            }));
        });
    }
    reloadProductMix() {
        const p = this.mixPeriod();
        const period = { startDate: p.startDate.format('YYYY-MM-DD'), endDate: p.endDate.format('YYYY-MM-DD') };
        forkJoin([this.stats.showProjectProductMix(period), this.stats.showProjectSuccessRate(period)]).subscribe(([mix, rate]) => {
            this.#buildProductMixCharts(mix);
            this.#buildSuccessRateChart(rate);
        });
    }

    #buildProductMixCharts(mix: ProjectProductMixResponse) {
        const groupMeta = new Map<string, { name: string; color: string }>();
        mix.groups.forEach((g) => groupMeta.set('' + g.id, { name: g.name, color: g.color || Color.uniqueColorFromString('' + g.id) }));
        if (mix.unassigned.count > 0) {
            groupMeta.set('unassigned', { name: $localize`:@@i18n.common.unassigned:unassigned`, color: '#333333' });
        }

        const countSegments = [...mix.groups.map((g) => ({ id: '' + g.id, value: g.count })), ...(mix.unassigned.count > 0 ? [{ id: 'unassigned', value: mix.unassigned.count }] : [])];
        const netSegments = [...mix.groups.map((g) => ({ id: '' + g.id, value: Math.max(0, g.net) })), ...(mix.unassigned.net > 0 ? [{ id: 'unassigned', value: mix.unassigned.net }] : [])];
        const totalNet = netSegments.reduce((sum, s) => sum + s.value, 0);

        this.#lastMix = mix;
        this.#lastGroupMeta = groupMeta;

        this.data.update((current) => ({
            ...current,
            product_mix: {
                chart: { height: 260 },
                backgroundColor: 'transparent',
                animation: false,
                tooltip: { trigger: 'item', ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS, formatter: (rawParams: unknown) => { const p = rawParams as { name: string; value: number }; return `${p.name}: ${p.value}`; } },
                graphic: [{ type: 'text', left: 'center', top: 'center', style: { text: '' + mix.total, fill: '#fff', fontSize: 22 } }],
                series: [
                    {
                        type: 'pie',
                        radius: ['40%', '70%'],
                        data: countSegments.map((s) => ({ value: s.value, name: groupMeta.get(s.id)?.name ?? s.id, itemStyle: { color: groupMeta.get(s.id)?.color, ...ECHARTS_DONUT_ITEM_STYLE } })),
                        label: { show: false },
                    },
                ],
            },
            revenue_by_group: {
                chart: { height: 260 },
                backgroundColor: 'transparent',
                animation: false,
                tooltip: { trigger: 'item', ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS, formatter: (rawParams: unknown) => { const p = rawParams as { name: string; value: number }; return `${p.name}: ${this.moneyPipe.transform(p.value)}`; } },
                graphic: [{ type: 'text', left: 'center', top: 'center', style: { text: this.moneyPipe.transform(totalNet), fill: '#fff', fontSize: 14 } }],
                series: [
                    {
                        type: 'pie',
                        radius: ['40%', '70%'],
                        data: netSegments.map((s) => ({ value: s.value, name: groupMeta.get(s.id)?.name ?? s.id, itemStyle: { color: groupMeta.get(s.id)?.color, ...ECHARTS_DONUT_ITEM_STYLE } })),
                        label: { show: false },
                    },
                ],
            },
            finished_timeline: this.#buildTimelineChart(mix, groupMeta),
        }));
    }

    #buildTimelineChart(mix: ProjectProductMixResponse, groupMeta: Map<string, { name: string; color: string }>) {
        const mode = this.timelineMode();
        const groupIds = Array.from(groupMeta.keys()).filter((id) => mix.timeline.some((t) => (t.groups[id]?.[mode] ?? 0) > 0));
        return {
            chart: { height: 260 },
            backgroundColor: 'transparent',
            animation: false,
            grid: { left: 30, right: 10, top: 10, bottom: 30 },
            xAxis: { type: 'category', show: true, data: mix.timeline.map((t) => dayjs(t.period + '-01').format('MMM YYYY')) },
            yAxis: { type: 'value', show: true, min: 0 },
            tooltip: {
                trigger: 'axis',
                ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS,
                formatter: (params: TooltipParams[]) => params.map((p) => `<span style="color:${p.color}">●</span> ${p.seriesName}: ${mode === 'net' ? this.moneyPipe.transform(p.value[1]) : p.value[1]}`).join('<br>'),
            },
            series: groupIds.map((id) => ({
                name: groupMeta.get(id)!.name,
                type: 'bar',
                stack: 'total',
                itemStyle: { color: groupMeta.get(id)!.color },
                data: mix.timeline.map((t) => t.groups[id]?.[mode] ?? 0),
            })),
        };
    }

    toggleTimelineMode() {
        this.timelineMode.update((mode) => (mode === 'count' ? 'net' : 'count'));
        if (this.#lastMix && this.#lastGroupMeta) {
            this.data.update((current) => ({ ...current, finished_timeline: this.#buildTimelineChart(this.#lastMix!, this.#lastGroupMeta!) }));
        }
    }

    #buildSuccessRateChart(rate: ProjectSuccessRateResponse) {
        const total = rate.successful + rate.unsuccessful;
        const pct = total > 0 ? (rate.successful / total) * 100 : 0;
        const successColor = Color.fromVar('--color-success-soft', '').toHexString();
        const dangerColor = Color.fromVar('--color-danger-soft', '').toHexString();
        this.data.update((current) => ({
            ...current,
            success_rate: {
                chart: { height: 260 },
                backgroundColor: 'transparent',
                animation: false,
                tooltip: { trigger: 'item', ...ECHARTS_DEFAULT_TOOLTIP_OPTIONS },
                graphic: [{ type: 'text', left: 'center', top: 'center', style: { text: `${pct.toFixed(1)}%`, fill: '#fff', fontSize: 20 } }],
                series: [
                    {
                        type: 'pie',
                        radius: ['40%', '70%'],
                        data: [
                            { value: rate.successful, name: $localize`:@@i18n.common.successful:successful`, itemStyle: { color: successColor, ...ECHARTS_DONUT_ITEM_STYLE } },
                            { value: rate.unsuccessful, name: $localize`:@@i18n.common.unsuccessful:unsuccessful`, itemStyle: { color: dangerColor, ...ECHARTS_DONUT_ITEM_STYLE } },
                        ],
                        label: { show: false },
                    },
                ],
            },
        }));
    }

    onSvbStackedToggle() {
        const svb = this.data().svb;
        if (!svb) return;
        const stacked = !svb.chart?.stacked;
        this.data.update((current) => ({
            ...current,
            svb: {
                ...svb,
                chart: { ...svb.chart, stacked },
                series: svb.series!.map((s) => ({ ...s, stack: stacked ? 'total' : undefined, areaStyle: stacked ? s.areaStyle : undefined })),
            },
        }));
    }
}
