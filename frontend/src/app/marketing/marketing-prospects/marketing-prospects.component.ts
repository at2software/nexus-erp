import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { MarketingService } from '@models/marketing/marketing.service';
import { MarketingProspect } from '@models/marketing/marketing.prospect.model';
import { MarketingInitiative } from '@models/marketing/marketing-initiative.model';
import { NexusModule } from 'src/app/nx/nexus.module';
import { AvatarComponent } from '@app/_shards/avatar/avatar.component';
import { SearchService } from '@models/search.service';
import { ScrollbarComponent } from "@app/app/scrollbar/scrollbar.component";
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { NxGlobal } from 'src/app/nx/nx.global';
import { MarketingProspectActivity } from '@models/marketing/marketing-prospect-activity.model';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { User } from '@models/user/user.model';

@Component({
    selector: 'marketing-prospects',
    templateUrl: './marketing-prospects.component.html',
    styleUrls: ['./marketing-prospects.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, RouterModule, NgbDropdownModule, NgbTooltipModule, NexusModule, AvatarComponent, ScrollbarComponent, EmptyStateComponent, ToolbarComponent]
})
export class MarketingProspectsComponent implements OnInit {

    #marketingService = inject(MarketingService);
    #searchService = inject(SearchService);
    #route = inject(ActivatedRoute);
    #router = inject(Router);
    #inputModalService = inject(InputModalService);

    prospects: MarketingProspect[] = [];
    initiatives: MarketingInitiative[] = [];
    selectedProspect?: MarketingProspect;
    isLoading = false;

    get availableUsers(): User[] { return NxGlobal.global.team ?? []; }

    // Filters
    searchTerm = '';
    statusFilter = '';
    initiativeFilter = '';
    addedViaFilter = '';
    userFilter = '';

    readonly #STORAGE_KEY = 'marketing-prospects-filters';

    statusFilters = [
        {
            key: 'new',
            label: $localize`:@@i18n.common.new:new`,
            badgeClass: 'bg-cyan rounded-pill',
            icon: 'person_add',
            count: 0,
            selected: true
        },
        {
            key: 'engaged',
            label: $localize`:@@i18n.marketing.engaged:engaged`,
            badgeClass: 'bg-primary rounded-pill',
            icon: 'forum',
            count: 0,
            selected: true
        },
        {
            key: 'converted',
            label: $localize`:@@i18n.marketing.converted:converted`,
            badgeClass: 'bg-success rounded-pill',
            icon: 'verified',
            count: 0,
            selected: true
        },
        {
            key: 'unresponsive',
            label: $localize`:@@i18n.marketing.unresponsive:unresponsive`,
            badgeClass: 'bg-warning rounded-pill',
            icon: 'voice_over_off',
            count: 0,
            selected: true
        },
        {
            key: 'disqualified',
            label: $localize`:@@i18n.marketing.disqualified:disqualified`,
            badgeClass: 'bg-danger rounded-pill',
            icon: 'block',
            count: 0,
            selected: true
        },
        {
            key: 'on_hold',
            label: $localize`:@@i18n.marketing.on_hold:on hold`,
            badgeClass: 'bg-secondary rounded-pill',
            icon: 'pause_circle',
            count: 0,
            selected: true
        }
    ];

    onStatusFilterChange() {
        this.filterProspectsByStatus();
        this.#saveFiltersToLocalStorage();
    }

    filterProspectsByStatus() {
        // Update counts for each filter
        this.statusFilters.forEach(f => {
            f.count = this.prospects.filter(p => p.status === f.key).length;
        });
        const selectedKeys = this.statusFilters.filter(f => f.selected).map(f => f.key);
        // If all selected, show all
        if (selectedKeys.length === this.statusFilters.length) {
            this.filteredProspects = [...this.prospects];
        } else {
            this.filteredProspects = this.prospects.filter(p => selectedKeys.includes(p.status));
        }
    }

    filteredProspects: MarketingProspect[] = [];

    // Call filterProspectsByStatus after stats are updated
    // Remove duplicate #calculateStats

    // Link search
    companyMatches: any[] = [];
    contactMatches: any[] = [];
    selectedCompanyId: number | null = null;
    selectedContactId: number | null = null;

    // Today's activities
    todayActivities: MarketingProspectActivity[] = [];
    overdueActivities: MarketingProspectActivity[] = [];

    // Statistics
    stats = {
        total: 0,
        new: 0,
        engaged: 0,
        converted: 0,
        activitiesToday: 0,
        activitiesOverdue: 0
    };

    ngOnInit() {
        // Restore filters from localStorage
        this.#restoreFiltersFromLocalStorage();

        // Pre-select current user filter if not restored from localStorage
        if (!this.userFilter && NxGlobal.global.user) {
            this.userFilter = NxGlobal.global.user.id.toString();
        }

        this.#loadInitiatives();
        this.#loadProspects();
        this.#loadTodayActivities();

        // Track selected prospect from route
        this.#route.firstChild?.params.subscribe(params => {
            if (params['id']) {
                const prospect = this.prospects.find(p => p.id === params['id']);
                if (prospect) {
                    this.selectedProspect = prospect;
                }
            }
        });
    }

    #loadInitiatives() {
        this.#marketingService.indexInitiatives({ status: 'active' })
            .subscribe((response: any) => {
                this.initiatives = response.data || response;
                this.#refreshInitiativeOverdueCounts();
            });
    }

    #refreshInitiativeOverdueCounts() {
        const params: any = {};
        if (this.userFilter) params.user_id = parseInt(this.userFilter);
        this.#marketingService.indexProspects(params).subscribe((prospects: MarketingProspect[]) => {
            const counts = new Map<string, number>();
            prospects.forEach(p => {
                if (p.has_overdue_activities && p.marketing_initiative?.id &&
                    !['unresponsive', 'disqualified', 'on_hold'].includes(p.status)) {
                    const key = String(p.marketing_initiative.id);
                    counts.set(key, (counts.get(key) || 0) + 1);
                }
            });
            this.initiatives.forEach(i => {
                i.overdue_prospects_count = counts.get(String(i.id)) ?? 0;
            });
        });
    }

    #loadProspects() {
        this.isLoading = true;
        const params = {
            ...(this.searchTerm && { search: this.searchTerm }),
            ...(this.statusFilter && { status: this.statusFilter }),
            ...(this.initiativeFilter && { marketing_initiative_id: parseInt(this.initiativeFilter) }),
            ...(this.addedViaFilter && { added_via: this.addedViaFilter }),
            ...(this.userFilter && { user_id: parseInt(this.userFilter) })
        };

        this.#marketingService.indexProspects(params)
            .subscribe((response: any) => {
                this.prospects = response.data || response;
                this.#calculateStats();
                this.isLoading = false;

                // Auto-route to first prospect if no subroute selected
                if (this.prospects.length > 0 && !this.#route.firstChild) {
                    this.#router.navigate(['/marketing/prospects', this.prospects[0].id]);
                }
            });
    }

    #loadTodayActivities() {
        // This would need a specific endpoint for activities due today/overdue
        // For now, we'll implement this when the prospect is selected
    }

    selectProspect(prospect: MarketingProspect) {
        this.selectedProspect = prospect;
        this.#loadProspectDetails(prospect.id);
        // Automatically search for matches when selecting unlinked prospect
        if (!prospect.company_contact_id && !prospect.company_id) {
            this.#searchForMatches(prospect);
        }
    }

    #loadProspectDetails(id: string) {
        this.#marketingService.showProspect(id)
            .subscribe((prospect: MarketingProspect) => {
                this.selectedProspect = prospect;
                // Search for matches after loading details
                if (!prospect.company_contact_id && !prospect.company_id) {
                    this.#searchForMatches(prospect);
                }
            });
    }

    #searchForMatches(prospect: MarketingProspect) {
        // Search by name for contacts using SearchService
        if (prospect.name) {
            this.#searchService.search(prospect.name, { only: 'Contact,CompanyContact' })
                .subscribe((response: any) => {
                    this.contactMatches = (response || []).slice(0, 5);
                });
        }

        // Search by company for companies using SearchService
        if (prospect.company) {
            this.#searchService.search(prospect.company, { only: 'Company' })
                .subscribe((response: any) => {
                    this.companyMatches = (response || []).slice(0, 5);
                });
        }
    }

    updateProspectStatus(prospect: MarketingProspect, status: string) {
        this.#marketingService.updateProspect(prospect.id, { status: status as any })
            .subscribe(() => {
                const index = this.prospects.findIndex(p => p.id === prospect.id);
                if (index !== -1) {
                    this.prospects[index].status = status as any;
                }
                this.#calculateStats();
            });
    }

    markActivityCompleted(activity: MarketingProspectActivity, notes?: string) {
        if (!this.selectedProspect) return;

        this.#marketingService.updateProspectActivityStatus(
            this.selectedProspect.id,
            activity.id,
            { status: 'completed', notes }
        ).subscribe((updated: MarketingProspectActivity) => {
            // Update the activity in the selected prospect
            if (this.selectedProspect?.activities) {
                const index = this.selectedProspect.activities.findIndex(a => a.id === activity.id);
                if (index !== -1) {
                    this.selectedProspect.activities[index] = updated;
                }
            }
        });
    }

    markActivitySkipped(activity: MarketingProspectActivity, reason?: string) {
        if (!this.selectedProspect) return;

        this.#marketingService.updateProspectActivityStatus(
            this.selectedProspect.id,
            activity.id,
            { status: 'skipped', notes: reason }
        ).subscribe((updated: MarketingProspectActivity) => {
            if (this.selectedProspect?.activities) {
                const index = this.selectedProspect.activities.findIndex(a => a.id === activity.id);
                if (index !== -1) {
                    this.selectedProspect.activities[index] = updated;
                }
            }
        });
    }

    openLinkedInProfile(prospect: MarketingProspect) {
        if (prospect.linkedin_url) {
            window.open(prospect.linkedin_url, '_blank');
        }
    }

    get selectedUser(): User | undefined {
        return this.availableUsers.find(u => String(u.id) === String(this.userFilter));
    }

    get selectedUserName(): string {
        return this.selectedUser?.fullName ?? this.userFilter;
    }

    setUserFilter(id: any) {
        this.userFilter = id ? String(id) : '';
        this.#loadInitiatives();
        this.onFilterChange();
    }

    overdueCountForInitiative(initiative: MarketingInitiative): number {
        return initiative.overdue_prospects_count ?? 0;
    }

    isSubscribedToInitiative(initiative: MarketingInitiative): boolean {
        const checkId = this.userFilter ? parseInt(this.userFilter) : NxGlobal.global.user?.id;
        return initiative.users?.some(u => u.id === checkId) ?? false;
    }

    get totalOverdueCount(): number {
        return this.initiatives.reduce((sum, i) => sum + (i.overdue_prospects_count ?? 0), 0);
    }

    setInitiativeFilter(id: any) {
        this.initiativeFilter = id ? String(id) : '';
        this.onFilterChange();
    }

    onSearch = () => this.#loadProspects();

    onFilterChange = () => {
        this.#saveFiltersToLocalStorage();
        this.#loadProspects();
    };

    actionsResolved = () => this.#loadProspects();

    navigateToProspect(event: MouseEvent, prospect: MarketingProspect) {
        if (!event.ctrlKey && !event.shiftKey) {
            this.#router.navigate(['/marketing/prospects', prospect.id]);
        }
    }

    filterByStatus(status: string) {
        this.statusFilter = status;
        this.#loadProspects();
    }

    #calculateStats() {
        this.stats = {
            total: this.prospects.length,
            new: this.prospects.filter(p => p.status === 'new').length,
            engaged: this.prospects.filter(p => p.status === 'engaged').length,
            converted: this.prospects.filter(p => p.status === 'converted').length,
            activitiesToday: 0, // Would need to calculate from activities
            activitiesOverdue: 0 // Would need to calculate from activities
        };
        // After stats calculation, update filter counts and filtered prospects
        this.filterProspectsByStatus();
    }

    getStatusBadgeClass(status: string): string {
        switch (status) {
            case 'new': return 'bg-cyan';
            case 'engaged': return 'bg-primary';
            case 'converted': return 'bg-success';
            case 'unresponsive': return 'bg-warning';
            case 'disqualified': return 'bg-danger';
            case 'on_hold': return 'bg-secondary';
            default: return 'bg-secondary';
        }
    }

    getActivityStatusBadgeClass(status: string): string {
        switch (status) {
            case 'pending': return 'bg-warning';
            case 'completed': return 'bg-success';
            case 'skipped': return 'bg-secondary';
            case 'overdue': return 'bg-danger';
            case 'failed': return 'bg-danger';
            default: return 'bg-secondary';
        }
    }

    getPendingActivities(): MarketingProspectActivity[] {
        const activities = this.selectedProspect?.activities?.filter((a: any) => a.status === 'pending') || [];
        return activities.map(a => MarketingProspectActivity.fromJson(a));
    }

    getCompletedActivities(): MarketingProspectActivity[] {
        const activities = this.selectedProspect?.activities?.filter((a: any) => a.status === 'completed') || [];
        return activities.map(a => MarketingProspectActivity.fromJson(a));
    }

    isActivityOverdue(activity: MarketingProspectActivity): boolean {
        return new Date(activity.scheduled_at) < new Date() && activity.status === 'pending';
    }

    openEditActivityModal(activity: MarketingProspectActivity) {
        console.log('openEditActivityModal called', activity);
        // TODO: Implement edit activity modal
        alert('Edit activity modal - to be implemented');
    }

    // Linking methods
    linkToCompany() {
        if (!this.selectedProspect || !this.selectedCompanyId) return;

        this.#marketingService.linkToCompany(this.selectedProspect.id, `${this.selectedCompanyId}`).subscribe((updated: any) => {
            this.selectedProspect = MarketingProspect.fromJson(updated);
            this.selectedCompanyId = null;
            this.companyMatches = [];
            this.contactMatches = [];
            this.#loadProspects();
        });
    }

    linkToContact() {
        if (!this.selectedProspect || !this.selectedContactId) return;

        this.#marketingService.updateProspect(this.selectedProspect.id, {
            company_contact_id: this.selectedContactId
        }).subscribe((updated: MarketingProspect) => {
            this.selectedProspect = updated;
            this.selectedContactId = null;
            this.companyMatches = [];
            this.contactMatches = [];
            this.#loadProspects();
        });
    }

    unlinkContact() {
        if (!this.selectedProspect) return;

        if (!confirm('Unlink this contact from the prospect?')) return;

        this.#marketingService.updateProspect(this.selectedProspect.id, {
            company_contact_id: null
        }).subscribe((updated: MarketingProspect) => {
            this.selectedProspect = updated;
            this.#loadProspects();
        });
    }

    unlinkCompany() {
        if (!this.selectedProspect) return;

        if (!confirm('Unlink this company from the prospect?')) return;

        this.#marketingService.updateProspect(this.selectedProspect.id, {
            company_id: null
        }).subscribe((updated: MarketingProspect) => {
            this.selectedProspect = updated;
            this.#loadProspects();
        });
    }

    createNewProspect() {
        // Get the selected initiative
        const initiative = this.initiatives.find(i => String(i.id) === String(this.initiativeFilter));
        if (!initiative) {
            console.error('No initiative found', {
                initiativeFilter: this.initiativeFilter,
                initiatives: this.initiatives.map(i => ({ id: i.id, name: i.name }))
            });
            return;
        }

        console.log('Initiative:', initiative);

        // Get the primary channel or first channel
        let leadSourceId: number | null = null;
        if (initiative.channels && initiative.channels.length > 0) {
            const primaryChannel = initiative.channels.find((c: any) => c.pivot?.is_primary);
            leadSourceId = primaryChannel ? primaryChannel.id : initiative.channels[0].id;
        }

        if (!leadSourceId) {
            alert('No lead source configured for this initiative');
            return;
        }

        // Ask for prospect name
        this.#inputModalService.open('Prospect Name').then(result => {
            if (!result) return;

            const prospectName = result.text.trim();
            if (!prospectName) return;

            // Parse name into components (simple: last word is family name, rest is given name)
            const nameParts = prospectName.split(' ');
            const familyName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : prospectName;
            const givenName = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';

            const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${prospectName}\nN:${familyName};${givenName};;;\nX-LANG:de\nX-FORMALITY:formal\nORG:\nROLE:\nEMAIL:\nTEL:\nEND:VCARD`;
            const newProspect = {
                name: prospectName,
                vcard: vcard,
                email: '',
                status: 'new',
                added_via: 'manual',
                marketing_initiative_id: this.initiativeFilter,
                lead_source_id: leadSourceId
            };

            this.#marketingService.storeProspect(newProspect).subscribe((created: MarketingProspect) => {
                this.prospects.unshift(created);
                this.selectedProspect = created;
                this.#calculateStats();
                // Navigate to the new prospect
                this.#router.navigate(['/marketing/prospects', created.id]);
            });
        }).catch(err => {
            console.error('Modal error:', err);
        });
    }

    #saveFiltersToLocalStorage() {
        const filters = {
            initiativeFilter: this.initiativeFilter,
            userFilter: this.userFilter,
            statusFilters: this.statusFilters.map(f => ({
                key: f.key,
                selected: f.selected
            }))
        };
        localStorage.setItem(this.#STORAGE_KEY, JSON.stringify(filters));
    }

    #restoreFiltersFromLocalStorage() {
        try {
            const saved = localStorage.getItem(this.#STORAGE_KEY);
            if (saved) {
                const filters = JSON.parse(saved);
                
                if (filters.initiativeFilter !== undefined) {
                    this.initiativeFilter = filters.initiativeFilter;
                }
                
                if (filters.userFilter !== undefined) {
                    this.userFilter = filters.userFilter;
                }
                
                if (filters.statusFilters && Array.isArray(filters.statusFilters)) {
                    filters.statusFilters.forEach((savedFilter: any) => {
                        const filter = this.statusFilters.find(f => f.key === savedFilter.key);
                        if (filter) {
                            filter.selected = savedFilter.selected;
                        }
                    });
                }
            }
        } catch (error) {
            console.error('Error restoring filters from localStorage:', error);
        }
    }
}
