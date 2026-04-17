import { Component, inject, signal, computed, input, output } from '@angular/core'
import { FormsModule } from '@angular/forms'
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap'
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs'
import { DebriefService } from '@models/project/debrief.service'
import { DebriefPositive } from '@models/project/debrief-positive.model'
import { DebriefProblemCategory } from '@models/project/debrief-problem-category.model'

@Component({
    selector: 'debrief-positive-autocomplete',
    standalone: true,
    imports: [FormsModule, NgbDropdownModule],
    templateUrl: './debrief-positive-autocomplete.component.html',
    styleUrls: ['./debrief-positive-autocomplete.component.scss']
})
export class DebriefPositiveAutocompleteComponent {
    
    categories  = input<DebriefProblemCategory[]>([])
    addPositive = output<{ title: string, categoryId?: string, existingId?: string }>()

    searchTerm         = signal('')
    selectedCategoryId = signal<string | null>(null)
    showDropdown       = signal(false)
    isSearching        = signal(false)
    searchResults      = signal<DebriefPositive[]>([])

    selectedCategoryName = computed(() =>
        this.categories().find(c => c.id === this.selectedCategoryId())?.name ?? ''
    )

    #selectedPositiveId: string | null = null
    #service = inject(DebriefService)

    constructor() {
        toObservable(this.searchTerm).pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(term => {
                if (!term || term.length < 2) {
                    this.searchResults.set([])
                    this.showDropdown.set(false)
                    this.isSearching.set(false)
                    return of(null)
                }
                this.isSearching.set(true)
                return this.#service.searchPositives(term)
            }),
            takeUntilDestroyed()
        ).subscribe(results => {
            if (results) {
                this.searchResults.set(results)
                this.showDropdown.set(true)
            }
            this.isSearching.set(false)
        })
    }

    onInput(term: string) {
        this.#selectedPositiveId = null
        this.searchTerm.set(term)
    }

    onFocus() {
        if (this.searchTerm().length >= 2) this.showDropdown.set(true)
    }

    onBlur() {
        setTimeout(() => this.showDropdown.set(false), 200)
    }

    selectPositive(positive: DebriefPositive) {
        this.searchTerm.set(positive.title)
        this.selectedCategoryId.set(positive.debrief_problem_category_id || null)
        this.showDropdown.set(false)
        this.searchResults.set([])
        this.#selectedPositiveId = positive.id
        this.onAdd()
    }

    onAdd() {
        const title = this.searchTerm().trim()
        if (!title) return
        this.addPositive.emit({ title, categoryId: this.selectedCategoryId() ?? undefined, existingId: this.#selectedPositiveId ?? undefined })
        this.#selectedPositiveId = null
        this.searchTerm.set('')
        this.selectedCategoryId.set(null)
        this.searchResults.set([])
        this.showDropdown.set(false)
    }
}
