import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { MarketingService } from '@models/marketing/marketing.service';
import { MarketingInitiative } from '@models/marketing/marketing-initiative.model';
import { FormsModule } from '@angular/forms';
import { Nx } from '@app/nx/nx.directive';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { GuidedTourComponent } from '@shards/guided-tour/guided-tour.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'marketing-initiatives',
    templateUrl: './marketing-initiatives.component.html',
    styleUrls: ['./marketing-initiatives.component.scss'],
    imports: [FormsModule, RouterModule, Nx, NgbTooltipModule, EmptyStateComponent, GuidedTourComponent, SpinnerComponent],
})
export class MarketingInitiativesComponent {
    #marketingService = inject(MarketingService);
    #router = inject(Router);
    #route = inject(ActivatedRoute);

    initiatives = signal<MarketingInitiative[]>([]);
    allInitiatives = signal<MarketingInitiative[]>([]);
    isLoading = signal<boolean>(false);
    showCreateModal = signal(false);
    showRootOnly = true;

    searchTerm = '';
    statusFilter = 'active';

    newInitiative: Partial<MarketingInitiative> = {
        name: '',
        description: '',
        status: 'active',
    };

    stats = signal({
        total: 0,
        active: 0,
        paused: 0,
        completed: 0,
    });

    constructor() {
        this.loadInitiatives();
    }

    loadInitiatives() {
        this.isLoading.set(true);
        this.#marketingService.indexInitiatives().subscribe((response) => {
            this.allInitiatives.set(response.data);
            this.#applyFilters();
            this.#calculateStats(this.allInitiatives());
            this.isLoading.set(false);

            const initiatives = this.initiatives();
            if (!this.#route.firstChild?.snapshot.params['id'] && initiatives.length > 0) {
                this.#router.navigate(['/marketing/initiatives', initiatives[0].id]);
            }
        });
    }

    #applyFilters() {
        let filtered = this.allInitiatives();
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter((i) => i.name?.toLowerCase().includes(term) || i.description?.toLowerCase().includes(term));
        }
        if (this.statusFilter) {
            filtered = filtered.filter((i) => i.status === this.statusFilter);
        }
        if (this.showRootOnly) {
            filtered = filtered.filter((i) => !i.parent_id);
        }
        filtered = [...filtered].sort((a, b) => (b.prospects_count || 0) - (a.prospects_count || 0));
        this.initiatives.set(filtered);
    }

    createInitiative() {
        if (!this.newInitiative.name) return;
        this.#marketingService.storeInitiative(this.newInitiative).subscribe((initiative: MarketingInitiative) => {
            this.initiatives.update((arr) => [initiative, ...arr]);
            this.allInitiatives.update((arr) => [initiative, ...arr]);
            this.resetCreateForm();
            this.#calculateStats(this.allInitiatives());
        });
    }

    filterByStatus = (status: string) => {
        this.statusFilter = status;
        this.#applyFilters();
    };

    resetCreateForm() {
        this.newInitiative = { name: '', description: '', status: 'active' };
        this.showCreateModal.set(false);
    }

    #calculateStats(allInitiatives?: MarketingInitiative[]) {
        const initiatives = allInitiatives || this.initiatives();
        this.stats.set({
            total: initiatives.length,
            active: initiatives.filter((i) => i.status === 'active').length,
            paused: initiatives.filter((i) => i.status === 'paused').length,
            completed: initiatives.filter((i) => i.status === 'completed').length,
        });
    }
}
