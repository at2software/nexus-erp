import { ChangeDetectionStrategy, afterNextRender, Component, DestroyRef, ElementRef, inject } from '@angular/core';
import { ToolbarService } from './toolbar.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'toolbar',
    templateUrl: './toolbar.component.html',
    styleUrls: ['./toolbar.component.scss'],
})
export class ToolbarComponent {
    #toolbarService = inject(ToolbarService);
    #el = inject(ElementRef);

    constructor() {
        afterNextRender(() => this.#toolbarService.add(this.#el));
        inject(DestroyRef).onDestroy(() => this.#toolbarService.component?.remove(this.#el));
    }
}
