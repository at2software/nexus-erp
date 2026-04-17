import { Component, ViewChild, OnChanges, input } from '@angular/core';
import { ChartComponent, NgApexchartsModule } from 'ng-apexcharts';

import { deepMerge } from '@constants/deepMerge';
import { chartTooltipHideEvent } from './chartTooltipHideEvent';

@Component({
    selector: 'apx-chart-x',
    templateUrl: './apx-chart-x.component.html',
    standalone: true,
    imports: [NgApexchartsModule]
})
export class ApxChartXComponent implements OnChanges {
    
    options = input<any>()

    @ViewChild(ChartComponent) chart: ChartComponent;

    ngOnChanges(changes:any) {
        if ('options' in changes) {
            changes = deepMerge(changes, { chart: { events: chartTooltipHideEvent }})
        }
    }

}