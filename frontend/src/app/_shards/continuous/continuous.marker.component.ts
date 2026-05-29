import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit, effect, inject, input, output, signal } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { Serializable } from '@models/serializable';
import { NexusHttpService } from '@models/http/http.nexus';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'continuous-marker',
    templateUrl: './continuous.marker.component.html',
    styleUrls: ['./continuous.marker.component.scss'],
    standalone: true,
    imports: [ToolbarComponent, SpinnerComponent],
})
export class ContinuousMarkerComponent implements OnInit, OnDestroy {
    active = signal(false);
    loaded = signal(false);
    remainingPages = signal(-1);
    autoloadRemaining = signal(false);

    #base: any = undefined;
    #isDestroyed = false;
    #next_page_url: string = '';
    #scrollHandler = () => this.#checkPosition();
    #observerSub?: Subscription;

    #ref = inject(ElementRef);
    #service = inject(NexusHttpService);

    observer = input<Observable<any> | undefined>(undefined);
    dataReceived = output<any>();

    constructor() {
        effect(() => {
            const obs = this.observer();
            if (!obs) {
                this.active.set(false);
                return;
            }
            this.loaded.set(false);
            this.active.set(true);
            this.autoloadRemaining.set(false);
            this.#base = undefined;
            this.#observerSub?.unsubscribe();
            this.#observerSub = obs.subscribe((x: any) => this.#onResult(x));
        });
    }

    ngOnInit() {
        window.addEventListener('scroll', this.#scrollHandler);
        document.addEventListener('scroll', this.#scrollHandler, true);
    }

    ngOnDestroy() {
        this.#isDestroyed = true;
        this.#observerSub?.unsubscribe();
        window.removeEventListener('scroll', this.#scrollHandler);
        document.removeEventListener('scroll', this.#scrollHandler, true);
    }

    loadRemaining() {
        if (!this.autoloadRemaining()) this.#next();
        this.autoloadRemaining.set(true);
    }

    #onResult(x: any) {
        if (this.#base === undefined) {
            if (x.data.length) this.#base = x.data[0];
        } else {
            if (this.#base instanceof Serializable) {
                const ctor = this.#base.constructor as any;
                x.data = x.data.map((o: any) => ctor.fromJson(o));
            }
        }
        this.dataReceived.emit(x.data);
        this.active.set(false);
        this.#next_page_url = x.next_page_url;
        this.remainingPages.set(x.last_page - x.current_page);
        if (x.next_page_url == null) {
            this.loaded.set(true);
            this.autoloadRemaining.set(false);
        } else {
            if (this.autoloadRemaining()) {
                setTimeout(() => this.#next(), 100);
            } else {
                setTimeout(() => this.#checkPosition(), 100);
            }
        }
    }

    #next() {
        if (!this.active() && !this.loaded() && !this.#isDestroyed) {
            this.active.set(true);
            this.#service.next(this.#next_page_url).subscribe((x: any) => this.#onResult(x));
        }
    }

    #checkPosition() {
        if (this.loaded() || this.autoloadRemaining() || this.active()) return;
        const rect = this.#ref.nativeElement.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom >= 0) this.#next();
    }
}
