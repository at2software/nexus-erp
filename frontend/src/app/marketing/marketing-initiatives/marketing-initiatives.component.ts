import { Component, OnInit, inject } from '@angular/core';
import { Router, ActivatedRoute, RouterModule, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs';
import { MarketingService } from '@models/marketing/marketing.service';
import { MarketingInitiative } from '@models/marketing/marketing-initiative.model';
import { MarketingProspectActivity } from '@models/marketing/marketing-prospect-activity.model';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { NexusModule } from 'src/app/nx/nexus.module';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { GuidedTourComponent } from '@shards/guided-tour/guided-tour.component';

@Component({
    selector: 'marketing-initiatives',
    templateUrl: './marketing-initiatives.component.html',
    styleUrls: ['./marketing-initiatives.component.scss'],
    standalone: true,
    imports: [FormsModule, RouterModule, NexusModule, NgbTooltipModule, DatePipe, EmptyStateComponent, GuidedTourComponent]
})
export class MarketingInitiativesComponent implements OnInit {

    #marketingService = inject(MarketingService);
    #router = inject(Router);
    #route = inject(ActivatedRoute);

    initiatives: MarketingInitiative[] = [];
    allInitiatives: MarketingInitiative[] = [];
    isLoading = false;
    showCreateModal = false;
    showRootOnly = true;

    // Search and filter
    searchTerm = '';
    statusFilter = 'active';

    // Recent activity panel
    selectedInitiativeId: string | null = null;
    recentActivities: MarketingProspectActivity[] = [];
    isLoadingRecent = false;

    // New initiative form
    newInitiative: Partial<MarketingInitiative> = {
        name: '',
        description: '',
        status: 'active'
    };

    // Statistics
    stats = {
        total: 0,
        active: 0,
        paused: 0,
        completed: 0
    };

    ngOnInit() {
        this.loadInitiatives();
        this.#router.events
            .pipe(filter(e => e instanceof NavigationEnd))
            .subscribe(() => {
                const id = this.#route.firstChild?.snapshot?.params['id'];
                if (id && id !== this.selectedInitiativeId) {
                    this.selectedInitiativeId = id;
                    this.loadRecentActivity(id);
                }
            });
    }

    loadInitiatives() {
        this.isLoading = true;

        this.#marketingService.indexInitiatives({})
            .subscribe((response: any) => {
                this.allInitiatives = response.data || response;
                this.#applyFilters();
                this.#calculateStats(this.allInitiatives);
                this.isLoading = false;

                // Auto-route to first initiative if no subroute selected
                const existingId = this.#route.firstChild?.snapshot?.params['id'];
                if (existingId) {
                    this.selectedInitiativeId = existingId;
                    this.loadRecentActivity(existingId);
                } else if (this.initiatives.length > 0) {
                    this.#router.navigate(['/marketing/initiatives', this.initiatives[0].id]);
                }
            });
    }

    #applyFilters() {
        let filtered = this.allInitiatives;

        // Apply search filter
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(i =>
                i.name?.toLowerCase().includes(term) ||
                i.description?.toLowerCase().includes(term)
            );
        }

        // Apply status filter
        if (this.statusFilter) {
            filtered = filtered.filter(i => i.status === this.statusFilter);
        }

        // Apply root only filter
        if (this.showRootOnly) {
            filtered = filtered.filter(i => !i.parent_id);
        }

        // Sort by prospect count descending
        filtered.sort((a, b) => (b.prospects_count || 0) - (a.prospects_count || 0));

        this.initiatives = filtered;
    }

    createInitiative() {
        if (!this.newInitiative.name) return;

        this.#marketingService.storeInitiative(this.newInitiative as any)
            .subscribe((initiative: MarketingInitiative) => {
                this.initiatives.unshift(initiative);
                this.allInitiatives.unshift(initiative);
                this.resetCreateForm();
                this.#calculateStats(this.allInitiatives);
            });
    }

    updateInitiativeStatus(initiative: MarketingInitiative, status: string) {
        this.#marketingService.updateInitiative(initiative.id, { status: status as any })
            .subscribe(() => {
                // Update in both arrays
                const index = this.initiatives.findIndex(i => i.id === initiative.id);
                if (index !== -1) {
                    this.initiatives[index].status = status as any;
                }
                const allIndex = this.allInitiatives.findIndex(i => i.id === initiative.id);
                if (allIndex !== -1) {
                    this.allInitiatives[allIndex].status = status as any;
                }
                this.#calculateStats(this.allInitiatives);
            });
    }

    deleteInitiative(initiative: MarketingInitiative) {
        if (!confirm(`Are you sure you want to delete "${initiative.name}"?`)) return;

        this.#marketingService.destroyInitiative(initiative.id)
            .subscribe(() => {
                this.initiatives = this.initiatives.filter(i => i.id !== initiative.id);
                this.allInitiatives = this.allInitiatives.filter(i => i.id !== initiative.id);
                this.#calculateStats(this.allInitiatives);
            });
    }

    onSearch() {
        this.#applyFilters();
    }

    onFilterChange() {
        this.#applyFilters();
    }

    filterByStatus = (status: string) => {
        this.statusFilter = status;
        this.#applyFilters();
    };

    loadRecentActivity(id: string) {
        this.isLoadingRecent = true;
        this.#marketingService.indexInitiativeRecentActivity(id)
            .subscribe({
                next: (activities: MarketingProspectActivity[]) => {
                    this.recentActivities = activities;
                    this.isLoadingRecent = false;
                },
                error: () => {
                    this.recentActivities = [];
                    this.isLoadingRecent = false;
                }
            });
    }

    getActivityStatusClass(status: string): string {
        switch (status) {
            case 'completed': return 'bg-success';
            case 'skipped':   return 'bg-dark text-muted';
            case 'overdue':   return 'bg-danger';
            case 'failed':    return 'bg-danger';
            case 'pending':   return 'bg-dark';
            default:          return 'bg-dark';
        }
    }

    resetCreateForm() {
        this.newInitiative = {
            name: '',
            description: '',
            status: 'active'
        };
        this.showCreateModal = false;
    }

    #calculateStats(allInitiatives?: MarketingInitiative[]) {
        const initiatives = allInitiatives || this.initiatives;
        this.stats = {
            total: initiatives.length,
            active: initiatives.filter(i => i.status === 'active').length,
            paused: initiatives.filter(i => i.status === 'paused').length,
            completed: initiatives.filter(i => i.status === 'completed').length
        };
    }

    getStatusBadgeClass(status: string): string {
        switch (status) {
            case 'active': return 'bg-success';
            case 'paused': return 'bg-warning';
            case 'completed': return 'bg-primary';
            default: return 'bg-secondary';
        }
    }

    getStatusIcon(status: string): string {
        switch (status) {
            case 'active': return 'play_circle';
            case 'paused': return 'pause_circle';
            case 'completed': return 'check_circle';
            default: return 'radio_button_unchecked';
        }
    }
}
