import { Component, ElementRef, EventEmitter, inject, Input, Output, ViewChild } from '@angular/core';
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

    @Output() itemSelected: EventEmitter<any> = new EventEmitter<any>()

    @Input() query: string = ''
    @Input() only: string
    @Input() has_icon: boolean = false
    @Input() minSearch: number = 3
    @Input() selected?: Serializable

    @ViewChild('searchbox') searchbox!: ElementRef<HTMLInputElement>
    @ViewChild('dropdown') dropdown!: ScrollbarComponent
    @ViewChild('p') searchContent: any

    currentIndex: number = 0
    results: any[] = []
    isLoading: boolean = false
    hasSearched: boolean = false

    #delay: any;
    #currentSearchTerm: string = ''
    #searchService = inject(SearchService)
    el = inject(ElementRef)

    hasResults = () => this.results.length
    shouldShowDropdown = () => this.hasSearched && (this.results.length > 0 || this.isLoading)
    focus = () => setTimeout(() => this.searchbox?.nativeElement.focus(), 0)
    empty = () => this.query = ''
    blur = () => this.searchbox?.nativeElement?.blur()
    clear = () => {
        this.results = []
        this.isLoading = false
        this.hasSearched = false
        this.#currentSearchTerm = ''
        if (this.#delay) {
            clearTimeout(this.#delay)
            this.#delay = null
        }
    }

    scrollToCurrentItem(): void {
        if (this.currentIndex < 0 || !this.dropdown) return;
        
        const dropdownElement = this.dropdown.el.nativeElement;
        const items = dropdownElement.querySelectorAll('.dropdown-item');
        const currentItem = items[this.currentIndex] as HTMLElement;
        
        if (currentItem) {
            const containerRect = dropdownElement.getBoundingClientRect();
            const itemRect = currentItem.getBoundingClientRect();
            
            // Calculate if the item is outside the visible area
            const topOffset = itemRect.top - containerRect.top;
            const bottomOffset = itemRect.bottom - containerRect.bottom;
            
            if (bottomOffset > 0) {
                // Item is below visible area - scroll down
                dropdownElement.scrollTop += bottomOffset + 10;
            } else if (topOffset < 0) {
                // Item is above visible area - scroll up
                dropdownElement.scrollTop += topOffset - 10;
            }
        }
    }

    ngAfterViewInit = () => this.focus()

    search(event: any) {
        const originalElement = event.srcElement || event.originalTarget
        const inputValue = originalElement?.value ?? event.target?.value ?? this.query
        
        // Handle keyboard navigation
        if (event.keyCode == 40) {
            event.preventDefault()
            this.currentIndex = (this.currentIndex + 1) % this.results.length
            this.scrollToCurrentItem()
            return
        }
        else if (event.keyCode == 38) {
            event.preventDefault()
            this.currentIndex = (this.results.length + this.currentIndex - 1) % this.results.length
            this.scrollToCurrentItem()
            return
        }
        else if (event.keyCode == 13) {
            event.preventDefault()
            if (this.results.length > 0 && this.results[this.currentIndex]) {
                this.searchbox.nativeElement.blur()
                this.open(this.results[this.currentIndex])
            }
            return
        }
        else if (event.keyCode == 27) { // Escape key
            event.preventDefault()
            this.clear()
            this.blur()
            return
        }

        // Handle text input changes
        if (this.#delay) clearTimeout(this.#delay)
        
        if ((inputValue?.length ?? 0) >= this.minSearch) {
            this.#delay = setTimeout(() => this.searchDelayed(inputValue), 300)
        } else if ((inputValue?.length ?? 0) === 0) {
            this.clear()
        }
    }

    onInput(event: any) {
        const inputValue = event.target.value
        this.query = inputValue
        this.#triggerSearch(inputValue)
    }

    onFocus() {
        // Re-trigger search if there's a query and no results
        if (this.query && this.query.length >= this.minSearch && this.results.length === 0) {
            this.#triggerSearch(this.query)
        }
    }

    onBlur() {
        // Small delay to allow clicks on dropdown items
        setTimeout(() => {
            if (!this.el.nativeElement.contains(document.activeElement)) {
                this.clear()
            }
        }, 150)
    }

    #triggerSearch(value: string) {
        if (this.#delay) clearTimeout(this.#delay)
        
        if ((value?.length ?? 0) >= this.minSearch) {
            this.#delay = setTimeout(() => this.searchDelayed(value), 300)
        } else if ((value?.length ?? 0) === 0) {
            this.clear()
        }
    }
    
    searchDelayed(search: string) {
        this.#currentSearchTerm = search
        this.isLoading = true
        this.hasSearched = true
        
        const filters: Dictionary = {}
        if (this.only) filters.only = this.only
        this.selected = undefined
        
        this.#searchService.search(search, filters).subscribe({
            next: (x: any) => {
                // Only update results if this is still the current search
                if (this.#currentSearchTerm === search) {
                    this.currentIndex = 0
                    this.results = Object.values(x).map((x: any) => REFLECTION(x))
                    this.isLoading = false
                }
            },
            error: (error: any) => {
                console.error('Search error:', error)
                this.isLoading = false
                this.results = []
            }
        })
    }

    selectItem(item: any, event?: Event) {
        if (event) {
            event.preventDefault()
            event.stopPropagation()
        }
        this.open(item)
    }

    preventBlur(event: Event) {
        event.preventDefault()
    }

    setCurrentIndex(index: number) {
        this.currentIndex = index
        // Note: We don't auto-scroll on mouse hover to avoid interfering with user's manual scrolling
    }

    scssFor(o: any) {
        switch (o.class) {
            case 'Company': return 'customer'
            case 'Project': return 'project'
            case 'Product': return 'product'
            case 'Invoice': return 'invoice'
        }
        return '/'
    }
    open(o: any) {
        this.results = []
        this.query = o.name
        this.selected = o
        this.itemSelected.emit(o)
    }
}
