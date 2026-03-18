import { Component, EventEmitter, Input, OnInit, Output, inject } from '@angular/core'
import { CommonModule } from '@angular/common'
import { FormsModule } from '@angular/forms'
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap'
import { Subject, debounceTime, distinctUntilChanged, switchMap, of } from 'rxjs'
import { DebriefService } from '@models/project/debrief.service'
import { DebriefSolution } from '@models/project/debrief-solution.model'
import { DebriefProblem } from '@models/project/debrief-problem.model'
import { NexusModule } from '@app/nx/nexus.module'

@Component({
    selector: 'debrief-solution-inline',
    standalone: true,
    imports: [CommonModule, FormsModule, NgbTooltipModule, NexusModule],
    templateUrl: './debrief-solution-inline.component.html',
    styleUrls: ['./debrief-solution-inline.component.scss']
})
export class DebriefSolutionInlineComponent implements OnInit {
    @Input() problem!: DebriefProblem
    @Input() debriefId?: string
    @Input() readonly = false
    @Output() solutionLinked = new EventEmitter<void>()
    @Output() solutionRated = new EventEmitter<void>()

    searchTerm = ''
    searchResults: DebriefSolution[] = []
    isSearching = false
    showDropdown = false
    showCreateForm = false
    newSolutionTitle = ''

    #service = inject(DebriefService)
    #searchSubject = new Subject<string>()

    ngOnInit() {
        this.#searchSubject.pipe(
            debounceTime(300),
            distinctUntilChanged(),
            switchMap(term => {
                if (!term || term.length < 2) {
                    return of([])
                }
                this.isSearching = true
                return this.#service.searchSolutions(term)
            })
        ).subscribe(results => {
            const linkedIds = this.problem.solutions.map(s => s.id)
            this.searchResults = results.filter(s => !linkedIds.includes(s.id))
            this.isSearching = false
            this.showDropdown = true
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

    linkSolution(solution: DebriefSolution) {
        this.#service.linkSolution(this.problem.id, solution.id, this.debriefId).subscribe(() => {
            this.searchTerm = ''
            this.searchResults = []
            this.showDropdown = false
            this.solutionLinked.emit()
        })
    }

    createAndLinkSolution() {
        if (!this.newSolutionTitle.trim()) return

        this.#service.storeSolution({ title: this.newSolutionTitle.trim() }).subscribe(solution => {
            this.#service.linkSolution(this.problem.id, solution.id, this.debriefId).subscribe(() => {
                this.newSolutionTitle = ''
                this.showCreateForm = false
                this.solutionLinked.emit()
            })
        })
    }

    rateSolution(solution: DebriefSolution, rating: number) {
        this.#service.rateSolution(this.problem.id, solution.id, rating).subscribe(() => {
            this.solutionRated.emit()
        })
    }

    unlinkSolution(solution: DebriefSolution) {
        this.#service.unlinkSolution(this.problem.id, solution.id).subscribe(() => {
            this.solutionLinked.emit()
        })
    }

    toggleCreateForm() {
        this.showCreateForm = !this.showCreateForm
        if (this.showCreateForm) {
            this.newSolutionTitle = this.searchTerm
        }
    }
}
