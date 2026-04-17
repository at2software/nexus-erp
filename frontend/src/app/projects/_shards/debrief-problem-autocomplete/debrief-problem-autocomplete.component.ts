import { Component, inject, input, output, signal } from '@angular/core'
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop'
import { FormsModule } from '@angular/forms'
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap'
import { debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs'
import { DebriefService } from '@models/project/debrief.service'
import { DebriefProblem } from '@models/project/debrief-problem.model'
import { DebriefProblemCategory } from '@models/project/debrief-problem-category.model'

@Component({
    selector: 'debrief-problem-autocomplete',
    standalone: true,
    imports: [FormsModule, NgbDropdownModule, NgbTooltipModule],
    templateUrl: './debrief-problem-autocomplete.component.html',
    styleUrls: ['./debrief-problem-autocomplete.component.scss']
})
export class DebriefProblemAutocompleteComponent {
    categories = input<DebriefProblemCategory[]>([])
    selectedCategoryId = input<string>()
    excludeProblemIds = input<string[]>([])
    problemSelected = output<DebriefProblem>()
    createProblem = output<{ title: string, categoryId: string }>()

    searchTerm = signal('')
    createCategoryId = signal<string | null>(null)
    searchResults = signal<DebriefProblem[]>([])
    isSearching = signal(false)
    showDropdown = signal(false)

    readonly #service = inject(DebriefService)

    constructor() {
        toObservable(this.searchTerm).pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(term => {
                if (!term || term.length < 2) {
                    this.searchResults.set([])
                    this.showDropdown.set(false)
                    return of(null)
                }
                this.isSearching.set(true)
                return this.#service.searchProblems(term, this.selectedCategoryId())
            }),
            takeUntilDestroyed()
        ).subscribe(results => {
            if (results) {
                this.searchResults.set(results.filter(p => !this.excludeProblemIds().includes(p.id)))
                this.showDropdown.set(true)
            }
            this.isSearching.set(false)
        })
    }

    onFocus() {
        if (this.searchTerm().length >= 2) this.showDropdown.set(true)
    }

    onBlur() {
        setTimeout(() => this.showDropdown.set(false), 200)
    }

    selectProblem(problem: DebriefProblem) {
        this.problemSelected.emit(problem)
        this.searchTerm.set('')
        this.searchResults.set([])
        this.showDropdown.set(false)
    }

    onCreateNew() {
        const term = this.searchTerm().trim()
        if (!term) return
        const categoryId = this.createCategoryId() || this.selectedCategoryId() || this.categories()[0]?.id
        if (!categoryId) return
        this.createProblem.emit({ title: term, categoryId })
        this.searchTerm.set('')
        this.searchResults.set([])
        this.showDropdown.set(false)
        this.createCategoryId.set(null)
    }

    getCategoryColor(categoryId: string): string {
        return this.categories().find(c => c.id === categoryId)?.color || '#888888'
    }

    getCategoryName(categoryId: string): string {
        return this.categories().find(c => c.id === categoryId)?.name || ''
    }
}
