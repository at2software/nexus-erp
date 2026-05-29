import { ChangeDetectionStrategy, Component, OnChanges, OnInit, inject, input } from '@angular/core';
import { EchartsCardComponent } from './echarts-card.component';
import { ParamService } from '@models/param.service';
import moment from 'moment';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '',
    standalone: true,
})
export abstract class EchartsParamCardComponent extends EchartsCardComponent implements OnChanges, OnInit {
    abstract updateSeries(result: any[]): void;

    keyPath = input<string | undefined>(undefined);
    chartData = input<any>(undefined);
    type = input<string>('bar');
    cluster = input<string>('month');
    offset = input<'none' | 'month' | 'year'>('none');

    #paramService = inject(ParamService);

    ngOnInit(): void {
        super.ngOnInit();
        this.reload();
    }
    ngOnChanges(changes: any): void {
        super.ngOnChanges(changes);
        if ('keyPath' in changes || 'chartData' in changes) {
            this.reload();
        }
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
            // Ensure chartData is an array (wrap single series in array)
            const dataArray = [this.chartData()].flat();
            return this.updateSeries(dataArray);
        }
        // Otherwise, fetch data using keyPath (legacy behavior)
        if (this.keyPath()) {
            this.chartOptions.update((o) => ({ ...o, series: [] }));
            this.echartsInstance()?.clear();
            const start = moment().startOf('month').subtract(36, 'month');
            this.#paramService.history(this.keyPath()!, start.unix(), 'month').subscribe((_) => this.updateSeries(_));
        }
    }
}
