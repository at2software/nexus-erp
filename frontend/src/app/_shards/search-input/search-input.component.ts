import { afterNextRender, Component, computed, ElementRef, inject, input, model, output, signal, viewChild } from '@angular/core';
import { SearchService } from '@models/search.service';
import { Serializable } from '@models/serializable';
import { Dictionary, REFLECTION } from '@constants/constants';
import { FormsModule } from '@angular/forms';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SafePipe } from 'src/pipes/safe.pipe';

@Component({
    selector: 'search-input',
    templateUrl: './search-input.component.html',
    styleUrls: ['./search-input.component.scss'],
    host: { class: 'd-flex border-0' },
    standalone: true,
    imports: [FormsModule, ScrollbarComponent, NgbTooltipModule, SafePipe]
})
export class SearchInputComponent {

    readonly itemSelected = output<any>()

    query     = model<string>('')
    only      = input<string>('')
    has_icon  = input<boolean>(false)
    minSearch = input<number>(3)
    selected  = model<Serializable | undefined>(undefined)

    protected readonly searchbox = viewChild.required<ElementRef<HTMLInputElement>>('searchbox')
    protected readonly dropdown  = viewChild<ScrollbarComponent>('dropdown')

    readonly currentIndex = signal(0)
    readonly results      = signal<any[]>([])
    readonly isLoading    = signal(false)
    readonly hasSearched  = signal(false)

    readonly hasResults        = computed(() => this.results().length > 0)
    readonly shouldShowDropdown = computed(() => this.hasSearched() && (this.results().length > 0 || this.isLoading()))

    #delay: ReturnType<typeof setTimeout> | null = null
    #currentSearchTerm = ''

    readonly #searchService = inject(SearchService)
    readonly #el            = inject(ElementRef)

    constructor() {
        afterNextRender(() => this.focus())
    }

    focus = () => setTimeout(() => this.searchbox()?.nativeElement.focus(), 0)
    empty = () => this.query.set('')
    blur  = () => this.searchbox()?.nativeElement?.blur()

    clear() {
        this.results.set([])
        this.isLoading.set(false)
        this.hasSearched.set(false)
        this.#currentSearchTerm = ''
        if (this.#delay) {
            clearTimeout(this.#delay)
            this.#delay = null
        }
    }

    scrollToCurrentItem(): void {
        const dropdown = this.dropdown()
        if (this.currentIndex() < 0 || !dropdown) return

        const dropdownElement = dropdown.el.nativeElement
        const items = dropdownElement.querySelectorAll('.dropdown-item')
        const currentItem = items[this.currentIndex()] as HTMLElement

        if (currentItem) {
            const containerRect = dropdownElement.getBoundingClientRect()
            const itemRect = currentItem.getBoundingClientRect()
            const bottomOffset = itemRect.bottom - containerRect.bottom
            const topOffset = itemRect.top - containerRect.top

            if (bottomOffset > 0) {
                dropdownElement.scrollTop += bottomOffset + 10
            } else if (topOffset < 0) {
                dropdownElement.scrollTop += topOffset - 10
            }
        }
    }

    onKeydown(event: KeyboardEvent) {
        switch (event.key) {
            case 'ArrowDown':
                event.preventDefault()
                this.currentIndex.set((this.currentIndex() + 1) % this.results().length)
                this.scrollToCurrentItem()
                break
            case 'ArrowUp':
                event.preventDefault()
                this.currentIndex.set((this.results().length + this.currentIndex() - 1) % this.results().length)
                this.scrollToCurrentItem()
                break
            case 'Enter': {
                event.preventDefault()
                const item = this.results()[this.currentIndex()]
                if (item) {
                    this.searchbox().nativeElement.blur()
                    this.open(item)
                }
                break
            }
            case 'Escape':
                event.preventDefault()
                this.clear()
                this.blur()
                break
        }
    }

    onInput(event: Event) {
        const value = (event.target as HTMLInputElement).value
        this.query.set(value)
        this.#triggerSearch(value)
    }

    onFocus() {
        const q = this.query()
        if (q.length >= this.minSearch() && !this.results().length) {
            this.#triggerSearch(q)
        }
    }

    onBlur() {
        setTimeout(() => {
            if (!this.#el.nativeElement.contains(document.activeElement)) {
                this.clear()
            }
        }, 150)
    }

    #triggerSearch(value: string) {
        if (this.#delay) clearTimeout(this.#delay)

        if (value.length >= this.minSearch()) {
            this.#delay = setTimeout(() => this.#searchDelayed(value), 300)
        } else if (value.length === 0) {
            this.clear()
        }
    }

    #searchDelayed(search: string) {
        this.#currentSearchTerm = search
        this.isLoading.set(true)
        this.hasSearched.set(true)

        const filters: Dictionary = {}
        if (this.only()) filters.only = this.only()
        this.selected.set(undefined)

        this.#searchService.search(search, filters).subscribe({
            next: (x: any) => {
                if (this.#currentSearchTerm === search) {
                    this.currentIndex.set(0)
                    this.results.set(Object.values(x).map((x: any) => REFLECTION(x)))
                    this.isLoading.set(false)
                }
            },
            error: () => {
                this.isLoading.set(false)
                this.results.set([])
            }
        })
    }

    selectItem(item: any, event?: Event) {
        event?.preventDefault()
        event?.stopPropagation()
        this.open(item)
    }

    preventBlur(event: Event) {
        event.preventDefault()
    }

    setCurrentIndex(index: number) {
        this.currentIndex.set(index)
    }

    open(o: any) {
        this.results.set([])
        this.query.set(o.name)
        this.selected.set(o)
        this.itemSelected.emit(o)
    }
}
