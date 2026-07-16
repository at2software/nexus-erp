import { Dictionary } from '@constants/constants';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import type { ParamChartPoint } from '@models/api-response';
import type { EChartsOption } from 'echarts';
import type { CallbackDataParams, EChartsType, TopLevelFormatterParams } from 'echarts/types/dist/shared';
import { BaseWidgetComponent } from '../base.widget.component';

import { dayjs } from '@constants/dates';
import { CASHFLOW_CHART_I18N, CASHFLOW_CHART_KEYS, CASHFLOW_I18N, EXPENSE_KEY, CASHFLOW_CHART_CHARTS } from './widget-cashflow.options';
import { Color } from '@constants/Color';
import { EChartsSimpleOptions } from '@charts/echarts-presets';
import { OptionType } from '../widget-options/widget-options.component';
import { MoneyPipe } from '@pipes/money.pipe';
import { WIDGET_SHARED } from '../widgets.shared';
import { ParamService } from '@models/param.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'widget-cashflow',
    templateUrl: './widget-cashflow.component.html',
    styleUrls: ['./../base.widget.component.scss'],
    imports: [...WIDGET_SHARED],
})
export class WidgetCashflowComponent extends BaseWidgetComponent {
    #mshort = new MoneyPipe();
    #paramService = inject(ParamService);
    #echartsInstance: EChartsType | undefined;

    chartOptions = signal<EChartsOption>({
        ...EChartsSimpleOptions,
        series: [],
        tooltip: {
            ...EChartsSimpleOptions.tooltip,
            formatter: (params: TopLevelFormatterParams) => this.#formatTooltip(Array.isArray(params) ? params : [params]),
        },
    } satisfies EChartsOption);

    #filteredKeys = () => CASHFLOW_CHART_KEYS.filter((_) => this.getOptions()[_]?.value ?? true);

    defaultOptions = () => {
        const ret: Dictionary<{ type: OptionType; value: unknown; i18n?: string }> = {};
        CASHFLOW_CHART_KEYS.forEach((_) => (ret[_] = { type: OptionType.Boolean, value: true, i18n: CASHFLOW_CHART_I18N[_] }));
        return ret;
    };

    reload() {
        if (!this.hasInvoicesExpenses()) return;

        const positionOf = (_: string) => CASHFLOW_CHART_KEYS.findIndex((x) => x === _);
        const keys = 'params/' + this.#filteredKeys().join(',');
        const startAt = dayjs().startOf('month').subtract(36, 'month').unix();
        this.#paramService.history(keys, startAt, 'month').subscribe((result) => {
            const maxVal: Dictionary<number> = {};
            const seriesResult = [result].flat();

            const echartsData = seriesResult
                .sort((a, b) => positionOf(a.name) - positionOf(b.name))
                .map((_, index) => {
                    if (!_ || !('data' in _)) return null;

                    const rawData = (_['data'] as ParamChartPoint[]) ?? [];
                    const processedData: [string, number][] = rawData.map((point) => {
                        const x = String(point.x);
                        const y = Number(point.y);
                        if (!(x in maxVal)) maxVal[x] = 0;
                        if (_.name !== EXPENSE_KEY) maxVal[x] += y;
                        return [x, y];
                    });

                    for (let i = dayjs().subtract(3, 'year').startOf('month').subtract(1, 'month'); i.isBefore(dayjs().startOf('month')); i = i.add(1, 'month')) {
                        const monthString = i.format('YYYY-MM-01');
                        if (!processedData.find((point) => point[0] == monthString)) {
                            processedData.push([monthString, 0]);
                        }
                    }

                    processedData.sort((a, b) => (a[0] && b[0] ? a[0].localeCompare(b[0]) : 0));

                    const isExpenseLine = _['name'] === EXPENSE_KEY;
                    const seriesName = CASHFLOW_I18N(_['name'] as string);

                    if (isExpenseLine) {
                        return {
                            name: seriesName,
                            type: 'line' as const,
                            symbol: 'none',
                            lineStyle: { width: 2, type: 'dashed' as const, color: this.#getSeriesColor(seriesName, index) },
                            itemStyle: { color: this.#getSeriesColor(seriesName, index) },
                            data: processedData,
                            smooth: false,
                        };
                    } else {
                        return {
                            name: seriesName,
                            type: 'line' as const,
                            stack: 'cashflow',
                            symbol: 'none',
                            areaStyle: { color: this.#getSeriesColor(seriesName, index, 25), opacity: 1 },
                            lineStyle: { width: 2, color: this.#getSeriesColor(seriesName, index) },
                            itemStyle: { color: this.#getSeriesColor(seriesName, index) },
                            data: processedData,
                            smooth: false,
                        };
                    }
                })
                .filter((series) => series !== null);

            const max = Math.max(...Object.values(maxVal));
            this.value.set(Object.values(maxVal)[Object.values(maxVal).length - 1]);

            this.chartOptions.set({
                ...this.chartOptions(),
                series: echartsData,
                yAxis: { ...this.chartOptions().yAxis, max: Math.ceil(max * 1.2) },
            });

            this.#echartsInstance?.setOption(this.chartOptions(), true);
        });
    }

    #getSeriesColor(seriesName: string, index: number, darkenAmount = 0): string {
        const chartKey = Object.keys(CASHFLOW_CHART_I18N).find((key) => CASHFLOW_CHART_I18N[key] === seriesName);
        if (chartKey && CASHFLOW_CHART_CHARTS[chartKey]) {
            const color = Color.fromVar(CASHFLOW_CHART_CHARTS[chartKey]);
            return darkenAmount > 0 ? color.darken(darkenAmount).toHexString() : color.toHexString();
        }
        const lightness = darkenAmount > 0 ? 35 : 50;
        return `hsl(${index * 40}, 70%, ${lightness}%)`;
    }

    #formatTooltip(params: CallbackDataParams[]): string {
        if (!params || params.length === 0) return '';

        const date = new Date(params[0].axisValue as string).toISOString().split('T')[0];
        let html = `<div style="font-weight: bold; margin-bottom: 8px;">${date}</div>`;
        let sum = 0;
        let items = '';

        params.forEach((param) => {
            if (param.seriesName !== CASHFLOW_I18N(EXPENSE_KEY)) sum += (param.value as number[])[1];
            if ((param.value as number[])[1] > 0) {
                items += `<div class="hstack gap-2">
                    <span class="flex-fill" style="color: ${param.color};">${param.seriesName}</span>
                    <span class="text-end" style="font-family: monospace;">${this.#mshort.transform((param.value as number[])[1])}</span>
                </div>`;
            }
        });

        html += items;
        html += `<div class="hstack gap-2" style="margin-top: 8px; border-top: 1px solid #666; padding-top: 4px;">
            <span class="flex-fill">∑</span>
            <span class="text-end" style="font-family: monospace;">${this.#mshort.transform(sum)}</span>
        </div>`;
        return html;
    }

    onChartInit = (ec: EChartsType) => (this.#echartsInstance = ec);
}
