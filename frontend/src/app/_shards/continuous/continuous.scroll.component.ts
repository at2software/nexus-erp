import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subject } from 'rxjs';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    template: '',
})
export abstract class ContinuousScrollComponent {
    #scrollSubject = new Subject();
    scroll = this.#scrollSubject.asObservable();

    router = inject(Router);
}
