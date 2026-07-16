import { ChangeDetectionStrategy, Component, ElementRef, inject } from '@angular/core';
import { ContinuousScrollComponent } from '@shards/continuous/continuous.scroll.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'scrollbar',
    templateUrl: './scrollbar.component.html',
    styleUrls: ['./scrollbar.component.scss'],
    host: { class: 'custom-scrollbar' },
    imports: [],
})
export class ScrollbarComponent extends ContinuousScrollComponent {
    el = inject(ElementRef);
}
