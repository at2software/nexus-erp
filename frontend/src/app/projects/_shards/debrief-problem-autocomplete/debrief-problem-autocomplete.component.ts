import { Component, EventEmitter, Input, OnInit, Output, inject, ChangeDetectorRef } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap'
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs'
import { DebriefService } from '@models/project/debrief.service'
import { DebriefProblem } from '@models/project/debrief-problem.model'
import { DebriefProblemCategory } from '@models/project/debrief-problem-category.model'

@Component({
    selector: 'debrief-problem-autocomplete',
    standalone: true,
    imports: [CommonModule, FormsModule, NgbDropdownModule, NgbTooltipModule],
    templateUrl: './debrief-problem-autocomplete.component.html',
    styleUrls: ['./debrief-problem-autocomplete.component.scss']
})
export class DebriefProblemAutocompleteComponent implements OnInit {
    @Input() categories: DebriefProblemCategory[] = []
    @Input() selectedCategoryId?: string
    @Input() excludeProblemIds: string[] = []
    @Output() problemSelected = new EventEmitter<DebriefProblem>()
    @Output() createProblem = new EventEmitter<{ title: string, categoryId: string }>()

    searchTerm = ''
    searchResults: DebriefProblem[] = []
    isSearching = false
    showDropdown = false

    #service = inject(DebriefService)
    #searchSubject = new Subject<string>()
    #cdr = inject(ChangeDetectorRef)

    ngOnInit() {
        this.#searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(term => {
                if (!term || term.length < 2) {
                    this.searchResults = []
                    this.showDropdown = false
                    return of(null)
                }
                this.isSearching = true
                return this.#service.searchProblems(term, this.selectedCategoryId)
            })
        ).subscribe(results => {
            if (results) {
                this.searchResults = results.filter(p => !this.excludeProblemIds.includes(p.id))
                this.showDropdown = true
            }
            this.isSearching = false
            this.#cdr.detectChanges()
        })
    }

    onSearchChange() {
        this.#searchSubject.next(this.searchTerm)
    }

    onFocus() {
        if (this.searchTerm.length >= 2) {
            this.showDropdown = true
        }
    }

    onBlur() {
        setTimeout(() => this.showDropdown = false, 200)
    }

    selectProblem(problem: DebriefProblem) {
        this.problemSelected.emit(problem)
        this.searchTerm = ''
        this.searchResults = []
        this.showDropdown = false
    }

    onCreateNew() {
        if (!this.searchTerm.trim()) return

        const categoryId = this.selectedCategoryId || this.categories[0]?.id
        if (!categoryId) return

        this.createProblem.emit({ title: this.searchTerm.trim(), categoryId })
        this.searchTerm = ''
        this.searchResults = []
        this.showDropdown = false
    }

    getCategoryColor(categoryId: string): string {
        return this.categories.find(c => c.id === categoryId)?.color || '#888888'
    }
}
