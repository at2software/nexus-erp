import {
    Directive,
    Input,
    Output,
    EventEmitter,
    TemplateRef,
    ViewContainerRef,
    Injector,
    ElementRef,
    OnDestroy,
    ChangeDetectorRef,
    runInInjectionContext,
    DoCheck,
    IterableDiffer,
    IterableDiffers,
    TrackByFunction,
    inject
} from '@angular/core';
import { Subscription } from 'rxjs';
import { Serializable } from 'src/models/serializable';
import { Nx, ActionEmitterType } from './nx.directive';

export interface NxForContext<T> {
    $implicit: T;
    index: number;
}

@Directive({
    selector: '[nxFor]',
    standalone: true
})
export class NxForDirective<T extends Serializable> implements OnDestroy, DoCheck {

    #items        : T[]                            = [];
    #nxDirectives : Nx[]                           = [];
    #subscriptions: Subscription[]                 = [];
    #differ       : IterableDiffer<T> | undefined  = undefined;
    #trackByFn    : TrackByFunction<T> | undefined = undefined;
    #templateRef  : TemplateRef<NxForContext<T>>   = inject(TemplateRef);
    #viewContainer: ViewContainerRef               = inject(ViewContainerRef);
    #injector     : Injector                       = inject(Injector);
    #cdr          : ChangeDetectorRef              = inject(ChangeDetectorRef);
    #differs      : IterableDiffers                = inject(IterableDiffers);

    @Input() nxContext?: any;  // Additional context data for context menu actions
    @Output() singleActionResolved: EventEmitter<ActionEmitterType> = new EventEmitter<ActionEmitterType>();
    @Output() actionsResolved: EventEmitter<ActionEmitterType> = new EventEmitter<ActionEmitterType>();

    @Input() set nxForOf(collection: T[]) {
        this.#items = collection || [];
        if (!this.#differ && this.#items) {
            this.#differ = this.#differs.find(this.#items).create(this.#trackByFn);
        }
    }

    @Input() set nxForTrackBy(fn: TrackByFunction<T>) {
        this.#trackByFn = fn;
        if (this.#differ && this.#items) {
            this.#differ = this.#differs.find(this.#items).create(this.#trackByFn);
        }
    }

    ngDoCheck(): void {
        if (this.#differ) {
            const changes = this.#differ.diff(this.#items);
            if (changes) {
                this.#render();
            }
        }
    }

    #render() {
        // Clear existing views and directives
        this.#clearAll();
        
        this.#items.forEach((item: T, index: number) => {
            const context: NxForContext<T> = { $implicit: item, index: index };

            const viewRef = this.#viewContainer.createEmbeddedView(this.#templateRef, context);
            const rootElement = viewRef.rootNodes[0] as HTMLElement;

            if (rootElement && rootElement.nodeType === Node.ELEMENT_NODE) {
                // Create Nx directive with proper injection context
                const nxDirective = this.#createNxDirective(rootElement, item);
                this.#nxDirectives.push(nxDirective);

                // Apply the directive's afterViewInit logic
                nxDirective.ngAfterViewInit();
                
                // Set up event listeners using the directive's methods
                this.#setupEventListeners(rootElement, nxDirective);
                
                // Apply host bindings manually
                rootElement.setAttribute('nx', '');
                
                // Add the nx directive reference to the element for getSiblings() to work
                (rootElement as any).nx = nxDirective;
                
                // Override setSelected to also update DOM classes
                const originalSetSelected = nxDirective.setSelected;
                nxDirective.setSelected = (value: boolean) => {
                    const result = originalSetSelected.call(nxDirective, value);
                    // Update the DOM class after setting the selected value
                    if (value) {
                        rootElement.classList.add('active');
                    } else {
                        rootElement.classList.remove('active');
                    }
                    return result;
                };
                
                // Set initial state
                if (nxDirective.selected) {
                    rootElement.classList.add('active');
                }
            }
        });

        this.#cdr.markForCheck();
    }

    #createNxDirective(element: HTMLElement, item: T): Nx {
        // Create a child injector that provides the ElementRef for this specific element
        const childInjector = Injector.create({
            providers: [
                { provide: ElementRef, useValue: new ElementRef(element) }
            ],
            parent: this.#injector
        });

        // Create the Nx directive instance within the proper injection context
        const nxDirective = runInInjectionContext(childInjector, () => {
            const directive = new Nx();
            // Set the inputs
            directive.nx = item;
            directive.tables = this.#items;
            directive.nxContext = this.nxContext;  // Pass the context to the directive
            return directive;
        });

        // Subscribe to the directive's EventEmitter outputs using the RxJS observable interface
        const actionSub = nxDirective.singleActionResolved.asObservable().subscribe((event: ActionEmitterType) => {
            this.singleActionResolved.emit(event);
        });
        
        const actionsResolvedSub = nxDirective.actionsResolved.asObservable().subscribe((event: ActionEmitterType) => {
            this.actionsResolved.emit(event);
        });
        
        // Store subscriptions for cleanup
        this.#subscriptions.push(actionSub, actionsResolvedSub);

        return nxDirective;
    }

    #setupEventListeners(element: HTMLElement, nxDirective: Nx) {
        // Use the directive's own event handlers
        element.addEventListener('click', (event: MouseEvent) => {
            nxDirective.onClick(event);
        });

        element.addEventListener('contextmenu', (event: MouseEvent) => {
            nxDirective.onContext(event);
        });
    }

    #clearAll() {
        // Unsubscribe from all subscriptions to prevent memory leaks
        this.#subscriptions.forEach(sub => sub.unsubscribe());
        this.#subscriptions = [];
        
        this.#viewContainer.clear();
        this.#nxDirectives = [];
    }

    ngOnDestroy() {
        this.#clearAll();
    }
}