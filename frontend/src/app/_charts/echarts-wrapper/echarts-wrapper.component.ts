import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgxEchartsDirective } from 'ngx-echarts';

@Component({
    selector: 'nx-echarts',
    template: `
        @if (options()) {
            <div echarts [options]="options()" [style.height.px]="options()?.chart?.height ?? 300" class="w-100"></div>
        }
    `,
    standalone: true,
    imports: [NgxEchartsDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EchartsComponent {
    options = input<any>();
}
