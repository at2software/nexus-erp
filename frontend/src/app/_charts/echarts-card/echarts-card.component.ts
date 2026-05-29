import { ChangeDetectionStrategy, Component, OnChanges, OnInit, SimpleChanges, inject, input, signal } from '@angular/core';
import { EChartsSimpleOptions } from '../echarts-presets';
import { NgxEchartsDirective } from 'ngx-echarts';
import { deepMerge } from '@constants/deepMerge';
import { GlobalService } from '@models/global.service';
import { Color } from '@constants/Color';
import type { EChartsOption } from 'echarts';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'echarts-card',
    templateUrl: './echarts-card.component.html',
    styleUrls: ['./echarts-card.component.scss'],
    standalone: true,
    imports: [NgxEchartsDirective],
})
export class EchartsCardComponent implements OnInit, OnChanges {
    readonly global = inject(GlobalService);
    
    value = input<number>(0);
    cardTitle = input<string>('');
    color = input<string | string[]>('primary');
    options = input<EChartsOption>({});
    suffix = input<string>('');
    roles = input<string | undefined>(undefined);


    chartOptions = signal<EChartsOption>({});
    protected echartsInstance = signal<any>(null);
    protected trend = signal<number>(0);

    protected individualOptions = (): object => ({});

    ngOnInit(): void {
        this.chartOptions.set(deepMerge(
            structuredClone(EChartsSimpleOptions),
            {
                series: [],
                tooltip: {
                    confine: true,
                    formatter: (params: any) => {
                        if (!params || params.length === 0) return '';

                        const xValue = params[0].axisValue;
                        const headerColor = Color.fromVar(this.getColor(0)).toHexString();
                        const headerTextColor = new Color(headerColor).bestBW().toHexString();

                        let html = `<div class="card-header text-center" style="background-color: ${headerColor}; color: ${headerTextColor}; padding: 4px;">${xValue}</div>`;

                        let total = 0;
                        html += '<div class="card-body p-1">';
                        params.forEach((param: any, i: number) => {
                            const seriesColor = param.color || this.getColor(i);
                            html += `<div class="f-b p-0 d-flex" style="color: ${seriesColor};">`;
                            html += `<div class="flex-fill px-2">${param.seriesName}</div>`;
                            html += `<div class="px-2 text-end">${param.value}${this.suffix()}</div></div>`;
                            total += param.value || 0;
                        });
                        html += `<div class="f-b p-0 d-flex"><div class="flex-fill px-2">&sum;</div><div class="px-2 text-end">${total}${this.suffix()}</div></div>`;
                        html += '</div>';
                        return `<div class="arrow_box">${html}</div>`;
                    },
                },
                xAxis: { type: 'time', show: false },
                yAxis: { type: 'value', show: false, min: 0 },
            },
            this.individualOptions(),
            this.options(),
        ));
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (this.chartOptions() && 'options' in changes && changes.options) {
            this.chartOptions.update((opts) => Object.assign({}, opts, changes.options));
            window.dispatchEvent(new Event('resize'));
        }
    }

    onChartInit(ec: any) {
        this.echartsInstance.set(ec);
    }

    protected colorArray = () => [this.color()].flat() as string[];
    protected getColor = (index: number) => {
        const c = this.colorArray();
        return c[index % c.length];
    };
}
