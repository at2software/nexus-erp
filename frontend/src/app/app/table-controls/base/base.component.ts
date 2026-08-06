import { DestroyRef, EventEmitter, inject, Service } from '@angular/core';
import { Observable, Subscription } from 'rxjs';

export class BaseObject {
    #subscriptions: Subscription[] = [];

    protected subscribe<T>(event: EventEmitter<T> | Observable<T> | undefined, callback: (value: T) => void, permanent: boolean = false): void {
        if (event) {
            const subscription = event.subscribe(callback.bind(this));
            if (!permanent) {
                this.#subscriptions.push(subscription);
            }
        }
    }

    protected setSubscriptions(): void {
        /* overridden by subclasses */
    }

    protected clearSubscriptions(): void {
        this.#subscriptions.forEach((subscription) => {
            subscription.unsubscribe();
        });
    }

    protected resubscribe(): void {
        this.clearSubscriptions();
        this.setSubscriptions();
    }
}

@Service()
export abstract class BaseComponent extends BaseObject {
    readonly #destroyRef = inject(DestroyRef);

    constructor() {
        super();
        this.setSubscriptions();
        this.#destroyRef.onDestroy(() => this.clearSubscriptions());
    }
}
