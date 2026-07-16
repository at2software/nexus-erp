import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { EchartsCardComponent } from './echarts-card.component';
import { ParamService } from '@models/param.service';
import { dayjs } from '@constants/dates';
import { ParamChartSeries } from '@models/api-response';


@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '',
})
export abstract class EchartsParamCardComponent extends EchartsCardComponent {
    abstract updateSeries(result: ParamChartSeries[]): void;

    keyPath = input<string | undefined>(undefined);
    chartData = input<ParamChartSeries[] | undefined>(undefined);
    type = input<string>('bar');
    cluster = input<string>('month');
    offset = input<'none' | 'month' | 'year'>('none');

    #paramService = inject(ParamService);

    constructor() {
        super();
        effect(() => {
            this.keyPath();
            this.chartData();
            this.roles();
            this.reload();
        });
    }

    seriesLength = () => this.keyPath()?.split(',').length ?? 0;

    reload() {
        // Check roles field
        if (this.roles()) {
            const requiredRoles = this.roles()!.split('|');
            if (!this.global.user?.hasAnyRole(requiredRoles)) {
                return;
            }
        }
        // If chartData is provided, use it directly instead of fetching
        if (this.chartData()) {
            const dataArray = this.chartData() ?? [];
            return this.updateSeries(dataArray);
        }
        // Otherwise, fetch data using keyPath (legacy behavior)
        if (this.keyPath()) {
            this.chartOptions.update((o) => ({ ...o, series: [] }));
            this.echartsInstance()?.clear();
            const start = dayjs().startOf('month').subtract(36, 'month');
            this.#paramService.history(this.keyPath()!, start.unix(), 'month').subscribe((_) => this.updateSeries(_));
        }
    }
}
