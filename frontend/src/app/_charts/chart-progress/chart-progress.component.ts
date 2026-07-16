import { PercentPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ShortPipe } from '@pipes/short.pipe';

@Component({
    selector: 'chart-progress',
    templateUrl: './chart-progress.component.html',
    styleUrls: ['./chart-progress.component.scss'],
    host: { class: 'd-block w-100' },
    imports: [NgbTooltipModule, ShortPipe, PercentPipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChartProgressComponent {
    max = input<number>(1);
    value = input<number>(1);
    title = input<string>('');
    suffix = input<string>('');
    scss = input<string | undefined>(undefined);
    color = input<string | undefined>(undefined);
}
