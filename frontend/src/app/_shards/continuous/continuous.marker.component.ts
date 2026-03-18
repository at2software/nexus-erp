import { Component, ElementRef, EventEmitter, inject, Input, OnChanges, OnDestroy, Output, OnInit } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { Serializable } from '@models/serializable'
import { BaseHttpService } from 'src/models/http.service';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';

@Component({
    selector: 'continuous-marker',
    templateUrl: './continuous.marker.component.html',
    styleUrls: ['./continuous.marker.component.scss'],
    standalone: true,
    imports: [ToolbarComponent]
})
export class ContinuousMarkerComponent implements OnChanges, OnDestroy, OnInit {

    active            : boolean = false
    loaded            : boolean = false
    remainingPages    : number  = -1
    autoloadRemaining : boolean = false

    #destroy$ = new Subject<void>();
    #base         : any = undefined
    #isDestroyed  : boolean = false
    #next_page_url: string
    #scrollHandler = () => this.#checkPosition()

    ref = inject(ElementRef)
    #service = inject(BaseHttpService)

    @Input() observer: Observable<any>
    @Output() dataReceived: EventEmitter<any> = new EventEmitter<any>()

    ngOnInit() {
        window.addEventListener('scroll', this.#scrollHandler)
        document.addEventListener('scroll', this.#scrollHandler, true)
    }
    ngOnChanges(): void {
        this.loaded = false
        this.active = true
        this.autoloadRemaining = false  // Reset autoload flag when observer changes
        this.#base = undefined
        this.observer?.subscribe((x: any) => this.#onResult(x))
    }
    ngOnDestroy() {
        this.#isDestroyed = true
        window.removeEventListener('scroll', this.#scrollHandler)
        document.removeEventListener('scroll', this.#scrollHandler, true)
        this.#destroy$.next();
        this.#destroy$.complete();
    }
    
    loadRemaining = () => {
        if (!this.autoloadRemaining) this.#next()
        this.autoloadRemaining = true
    }

    #onResult(x: any) {
        if (this.#base === undefined) {  // first page from original service
            if (x.data.length) {
                this.#base = x.data[0]
            }
        } else {  // following pages without real class information, has to be converted again
            if (this.#base instanceof Serializable) {
                const ctor = this.#base.constructor as any;
                x.data = x.data.map((o: any) => ctor.fromJson(o))
            }
        }
        this.dataReceived?.emit(x.data)
        this.active = false
        this.#next_page_url = x.next_page_url
        this.remainingPages = x.last_page - x.current_page
        if (x.next_page_url == null) {
            this.loaded = true
            this.autoloadRemaining = false  // Disable autoload when all pages are loaded
        } else {
            if (this.autoloadRemaining) {
                setTimeout(() => this.#next(), 100)
            } else {
                setTimeout(() => this.#checkPosition(), 100)
            }
        }
    }
    #next() {
        if (!this.active && !this.loaded && !this.#isDestroyed) {
            this.active = true
            this.#service.next(this.#next_page_url).subscribe((x: any) => {
                this.#onResult(x)
            })
        }
    }
    #checkPosition() {
        if (this.loaded) return
        if (this.autoloadRemaining) return
        if (this.active) return
        const rect = this.ref.nativeElement.getBoundingClientRect();
        const isInViewport = rect.top < window.innerHeight && rect.bottom >= 0;
        if (isInViewport) {
            this.#next()
        }
    }
}
