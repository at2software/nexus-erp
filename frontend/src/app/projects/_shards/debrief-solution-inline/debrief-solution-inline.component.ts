import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Subject, debounceTime, distinctUntilChanged, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DebriefService } from '@models/project/debrief.service';
import { DebriefSolution } from '@models/project/debrief-solution.model';
import { DebriefProblem } from '@models/project/debrief-problem.model';
import { Nx } from '@app/nx/nx.directive';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { tracked } from '@constants/tracked';

@Component({
    selector: 'debrief-solution-inline',
    imports: [FormsModule, NgbTooltipModule, Nx, DecimalPipe, SpinnerComponent],
    templateUrl: './debrief-solution-inline.component.html',
    styleUrls: ['./debrief-solution-inline.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DebriefSolutionInlineComponent {
    readonly problem = input.required<DebriefProblem>();
    readonly trackedProblem = tracked(this.problem);
    debriefId = input<string>();
    readonly = input(false);
    solutionLinked = output<void>();
    solutionRated = output<void>();

    searchTerm = signal('');
    searchResults = signal<DebriefSolution[]>([]);
    isSearching = signal(false);
    showDropdown = signal(false);
    showCreateForm = signal(false);
    newSolutionTitle = signal('');

    #service = inject(DebriefService);
    #searchSubject = new Subject<string>();

    #linkedIds = computed(() => this.trackedProblem().solutions.map((s) => s.id));

    constructor() {
        this.#searchSubject
            .pipe(
                debounceTime(300),
                distinctUntilChanged(),
                switchMap((term) => {
                    if (!term || term.length < 2) return of([]);
                    this.isSearching.set(true);
                    return this.#service.searchSolutions(term);
                }),
                takeUntilDestroyed(),
            )
            .subscribe((results) => {
                this.searchResults.set(results.filter((s) => !this.#linkedIds().includes(s.id)));
                this.isSearching.set(false);
                this.showDropdown.set(true);
            });
    }

    onSearchChange(term: string) {
        this.searchTerm.set(term);
        this.#searchSubject.next(term);
    }

    onFocus() {
        if (this.searchTerm().length >= 2) this.showDropdown.set(true);
    }

    onBlur() {
        setTimeout(() => this.showDropdown.set(false), 200);
    }

    linkSolution(solution: DebriefSolution) {
        this.#service.linkSolution(this.trackedProblem().id, solution.id, this.debriefId()).subscribe(() => {
            this.searchTerm.set('');
            this.searchResults.set([]);
            this.showDropdown.set(false);
            this.solutionLinked.emit();
        });
    }

    createAndLinkSolution() {
        const title = this.newSolutionTitle().trim();
        if (!title) return;
        this.#service.storeSolution({ title }).subscribe((solution) => {
            this.#service.linkSolution(this.trackedProblem().id, solution.id, this.debriefId()).subscribe(() => {
                this.newSolutionTitle.set('');
                this.showCreateForm.set(false);
                this.solutionLinked.emit();
            });
        });
    }

    rateSolution(solution: DebriefSolution, rating: number) {
        this.#service.rateSolution(this.trackedProblem().id, solution.id, rating).subscribe(() => {
            this.solutionRated.emit();
        });
    }

    unlinkSolution(solution: DebriefSolution) {
        this.#service.unlinkSolution(this.trackedProblem().id, solution.id).subscribe(() => {
            this.solutionLinked.emit();
        });
    }

    toggleCreateForm() {
        const show = !this.showCreateForm();
        this.showCreateForm.set(show);
        if (show) this.newSolutionTitle.set(this.searchTerm());
    }
}
