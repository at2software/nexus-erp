import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

/**
 * Can be used as base class for components with NgScrollbar to add a <continuous-marker> element
 * somewhere, that triggers position specific events (e.g. reaching the bottom)
 */
@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '',
})
export abstract class ContinuousScrollComponent {
    #scrollSubject = new Subject();
    scroll = this.#scrollSubject.asObservable();

    router = inject(Router);
}
