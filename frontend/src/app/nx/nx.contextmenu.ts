import { ChangeDetectionStrategy, Component, ElementRef, Renderer2, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NxAction } from './nx.actions';
import { ContextMenuTrigger, NxService } from './nx.service';
import { NgbDropdown, NgbDropdownMenu } from '@ng-bootstrap/ng-bootstrap';
import { AutopositionDirective } from '@directives/autoposition.directive';
import { NxDropdown } from './nx.dropdown';
import { NxGlobal } from './nx.global';
import { Serializable } from '@models/serializable';

@Component({
    selector: 'nx-contextmenu',
    changeDetection: ChangeDetectionStrategy.OnPush,
    templateUrl: 'nx.contextmenu.html',
    imports: [NxDropdown, NgbDropdown, NgbDropdownMenu],
    host: { '(window:keydown)': 'onDocumentKeyDown($event)' },
})
export class NxContextMenu {
    static _track_id = 0;
    static getTrackId = () => ++NxContextMenu._track_id;

    private readonly ngbDropdown = viewChild.required(NgbDropdown);
    private readonly dropdown = viewChild.required('dropdown', { read: ElementRef });

    readonly actions = signal<NxAction[]>([]);

    #service = inject(NxService);
    #re = inject(Renderer2);

    constructor() {
        this.#service.onContextMenu.pipe(takeUntilDestroyed()).subscribe(e => this.#onNewContextMenu(e));
    }

    onDocumentKeyDown = (event: KeyboardEvent) => this.#service.onDocumentKeyDown(event);

    #onNewContextMenu = (e: ContextMenuTrigger) => {
        this.ngbDropdown()?.close();
        if (e.objects.length === 0) return console.error('no objects selected');

        const firstNx = e.objects[0].nx();
        NxGlobal.context = firstNx instanceof Serializable ? firstNx : undefined;

        const sameClass = e.objects.every(_ => _.nx().class === firstNx.class);
        if (!sameClass) return console.error('different classes have been selected');

        this.actions.set(NxService.filteredActions(e.objects));

        const el = this.dropdown().nativeElement;
        this.#re.setStyle(el, 'left', e.event.clientX - 20 + 'px');
        this.#re.setStyle(el, 'top', e.event.clientY - 20 + 'px');

        this.ngbDropdown().open();
        setTimeout(() => AutopositionDirective.reposition(this.dropdown(), this.#re));
    };

}
