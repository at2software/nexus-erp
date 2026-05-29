import { ChangeDetectionStrategy, Component, computed, ElementRef, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { from, mergeMap, switchMap, tap, toArray } from 'rxjs';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { NgbDropdownModule, NgbModal, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { MarketingService } from '@models/marketing/marketing.service';
import { MarketingProspect } from '@models/marketing/marketing.prospect.model';
import { MarketingInitiative } from '@models/marketing/marketing-initiative.model';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { NxGlobal } from '@app/nx/nx.global';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { MarketingCsvImportModalComponent, parseCsv, type CsvColumnMapping, type CsvImportResult } from './marketing-csv-import-modal/marketing-csv-import-modal.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'marketing-prospects',
    templateUrl: './marketing-prospects.component.html',
    styleUrls: ['./marketing-prospects.component.scss'],
    standalone: true,
    imports: [FormsModule, RouterModule, NgbDropdownModule, NgbTooltipModule, Nx, AvatarComponent, EmptyStateComponent, ToolbarComponent, SpinnerComponent],
})
export class MarketingProspectsComponent {
    #marketingService = inject(MarketingService);
    #route = inject(ActivatedRoute);
    #router = inject(Router);
    #inputModalService = inject(InputModalService);
    #ngbModal = inject(NgbModal);
    readonly #STORAGE_KEY = 'marketing-prospects-filters';

    protected readonly fileInput = viewChild.required<ElementRef<HTMLInputElement>>('fileInput');

    isLoading = signal(false);
    prospects = signal<MarketingProspect[]>([]);
    initiatives = signal<MarketingInitiative[]>([]);
    initiativeFilter = signal('');
    userFilter = signal('');
    selectedProspectId = signal('');

    statusFilters = signal([
        { key: 'new',          label: $localize`:@@i18n.common.new:new`,                     badgeClass: 'bg-cyan rounded-pill',      icon: MarketingProspect.STATUS_ICONS['new'],          selected: true },
        { key: 'engaged',      label: $localize`:@@i18n.marketing.engaged:engaged`,           badgeClass: 'bg-primary rounded-pill',   icon: MarketingProspect.STATUS_ICONS['engaged'],      selected: true },
        { key: 'converted',    label: $localize`:@@i18n.marketing.converted:converted`,       badgeClass: 'bg-success rounded-pill',   icon: MarketingProspect.STATUS_ICONS['converted'],    selected: true },
        { key: 'unresponsive', label: $localize`:@@i18n.marketing.unresponsive:unresponsive`, badgeClass: 'bg-warning rounded-pill',   icon: MarketingProspect.STATUS_ICONS['unresponsive'], selected: true },
        { key: 'disqualified', label: $localize`:@@i18n.marketing.disqualified:disqualified`, badgeClass: 'bg-danger rounded-pill',    icon: MarketingProspect.STATUS_ICONS['disqualified'], selected: true },
        { key: 'on_hold',      label: $localize`:@@i18n.marketing.on_hold:on hold`,           badgeClass: 'bg-secondary rounded-pill', icon: MarketingProspect.STATUS_ICONS['on_hold'],      selected: true },
    ]);

    availableUsers    = computed(() => NxGlobal.global.team ?? []);
    selectedUser      = computed(() => this.availableUsers().find(u => String(u.id) === this.userFilter()));
    selectedUserName  = computed(() => this.selectedUser()?.fullName() ?? this.userFilter());
    totalOverdueCount = computed(() => this.initiatives().reduce((sum, i) => sum + (i.overdue_prospects_count ?? 0), 0));

    selectedInitiativeName         = computed(() => this.initiatives().find(i => String(i.id) === this.initiativeFilter())?.name ?? '');
    selectedInitiativeOverdueCount = computed(() => this.initiatives().find(i => String(i.id) === this.initiativeFilter())?.overdue_prospects_count ?? 0);

    statusCounts = computed(() => {
        const counts: Record<string, number> = {};
        this.prospects().forEach(p => counts[p.status] = (counts[p.status] ?? 0) + 1);
        return counts;
    });

    filteredProspects = computed(() => {
        const filters = this.statusFilters();
        const selected = filters.filter(f => f.selected).map(f => f.key);
        if (selected.length === filters.length) return this.prospects();
        return this.prospects().filter(p => selected.includes(p.status));
    });

    constructor() {
        this.#restoreFiltersFromLocalStorage();

        if (!this.userFilter() && NxGlobal.global.user) {
            this.userFilter.set(NxGlobal.global.user.id.toString());
        }

        const directId = this.#route.snapshot.firstChild?.params['id'];
        if (directId) {
            this.#marketingService.showProspect(directId).subscribe({
                next: (prospect: MarketingProspect) => {
                    const initiativeId = prospect.marketing_initiative?.id;
                    if (initiativeId) {
                        this.initiativeFilter.set(String(initiativeId));
                        this.#saveFiltersToLocalStorage();
                    }
                    this.#loadInitiatives();
                    this.#loadProspects();
                },
                error: () => { this.#loadInitiatives(); this.#loadProspects(); },
            });
        } else {
            this.#loadInitiatives();
            this.#loadProspects();
        }

        this.#route.firstChild?.params.pipe(takeUntilDestroyed()).subscribe(params => {
            this.selectedProspectId.set(params['id'] ?? '');
        });
    }

    #loadInitiatives() {
        const params: any = this.userFilter() ? { user_id: parseInt(this.userFilter()) } : {};
        this.#marketingService
            .indexInitiatives({ status: 'active' })
            .pipe(
                tap((response: any) => this.initiatives.set(response.data || response)),
                switchMap(() => this.#marketingService.indexProspects(params)),
            )
            .subscribe((prospects: MarketingProspect[]) => {
                const counts = new Map<string, number>();
                prospects.forEach(p => {
                    if (p.has_overdue_activities && p.marketing_initiative?.id && !['unresponsive', 'disqualified', 'on_hold'].includes(p.status)) {
                        const key = String(p.marketing_initiative.id);
                        counts.set(key, (counts.get(key) || 0) + 1);
                    }
                });
                this.initiatives.update(inits => {
                    inits.forEach(i => i.overdue_prospects_count = counts.get(String(i.id)) ?? 0);
                    return [...inits];
                });
            });
    }

    #loadProspects() {
        this.isLoading.set(true);
        const params = {
            ...(this.initiativeFilter() && { marketing_initiative_id: parseInt(this.initiativeFilter()) }),
            ...(this.userFilter() && { user_id: parseInt(this.userFilter()) }),
        };
        this.#marketingService.indexProspects(params).subscribe((response: any) => {
            this.prospects.set(response.data || response);
            this.isLoading.set(false);
            if (!this.#route.firstChild) {
                const first = this.filteredProspects()[0];
                if (first) this.#router.navigate(['/marketing/prospects', first.id]);
            }
        });
    }

    toggleStatusFilter(key: string) {
        this.statusFilters.update(filters => filters.map(f => f.key === key ? { ...f, selected: !f.selected } : f));
        this.#saveFiltersToLocalStorage();
    }

    setUserFilter(id: any) {
        this.userFilter.set(id ? String(id) : '');
        this.#saveFiltersToLocalStorage();
        this.#loadInitiatives();
        this.#loadProspects();
    }

    setInitiativeFilter(id: any) {
        this.initiativeFilter.set(id ? String(id) : '');
        this.#saveFiltersToLocalStorage();
        this.#loadProspects();
    }

    isSubscribedToInitiative(initiative: MarketingInitiative): boolean {
        const checkId = this.userFilter() ? parseInt(this.userFilter()) : NxGlobal.global.user?.id;
        return initiative.users?.some(u => u.id === checkId) ?? false;
    }

    actionsResolved = () => this.prospects.update(p => [...p]);

    navigateToProspect(event: MouseEvent, prospect: MarketingProspect) {
        if (!event.ctrlKey && !event.shiftKey) this.#router.navigate(['/marketing/prospects', prospect.id]);
    }

    createNewProspect() {
        const initiative = this.initiatives().find(i => String(i.id) === this.initiativeFilter());
        if (!initiative) return;

        const primaryChannel = initiative.channels?.find((c: any) => c.pivot?.is_primary);
        const leadSourceId: number | null = primaryChannel?.id ?? initiative.channels?.[0]?.id ?? null;

        if (!leadSourceId) {
            alert('No lead source configured for this initiative');
            return;
        }

        this.#inputModalService.open('Prospect Name').then(result => {
            const prospectName = result?.text?.trim();
            if (!prospectName) return;

            const nameParts = prospectName.split(' ');
            const familyName = nameParts.length > 1 ? nameParts.at(-1)! : prospectName;
            const givenName  = nameParts.length > 1 ? nameParts.slice(0, -1).join(' ') : '';
            const vcard = `BEGIN:VCARD\nVERSION:3.0\nFN:${prospectName}\nN:${familyName};${givenName};;;\nX-LANG:de\nX-FORMALITY:formal\nORG:\nROLE:\nEMAIL:\nTEL:\nEND:VCARD`;

            this.#marketingService.storeProspect({
                name: prospectName, vcard, email: '', status: 'new', added_via: 'manual',
                marketing_initiative_id: this.initiativeFilter(), lead_source_id: leadSourceId,
            }).subscribe((created: MarketingProspect) => {
                this.prospects.update(p => [created, ...p]);
                this.#router.navigate(['/marketing/prospects', created.id]);
            });
        }).catch(() => {});
    }

    exportCsv() {
        const prospects = this.filteredProspects();
        const headers = ['Name', 'Company', 'Email', 'Phone', 'Website', 'City', 'Role', 'Status'];
        const rows = prospects.map(p => {
            const card = p.card();
            return [
                p.getName(),
                card?.org ?? '',
                p.email ?? '',
                card?.first('TEL')?.vals[0] ?? '',
                card?.url ?? '',
                card?.first('ADR')?.vals[3] ?? '',
                card?.first('ROLE')?.vals[0] ?? '',
                p.status,
            ];
        });
        const csv = [headers, ...rows]
            .map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(','))
            .join('\n');
        const a = Object.assign(document.createElement('a'), {
            href: URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' })),
            download: 'prospects.csv',
        });
        a.click();
        URL.revokeObjectURL(a.href);
    }

    openImportFile() { this.fileInput().nativeElement.click(); }

    handleFileSelect(event: Event) {
        const file = (event.target as HTMLInputElement).files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const { headers, rows } = parseCsv(e.target!.result as string);
            if (!headers.length) return;
            const existingNames = this.prospects().flatMap(p => [
                p.getName()?.toLowerCase(),
                p.company()?.toLowerCase(),
            ]).filter((n): n is string => !!n);
            const modalRef = this.#ngbModal.open(MarketingCsvImportModalComponent, { size: 'xl' });
            modalRef.componentInstance.init({
                headers, rows,
                initiatives:         this.initiatives(),
                currentInitiativeId: this.initiativeFilter(),
                existingNames,
            });
            modalRef.result.then((result: CsvImportResult) => this.#doImport(result)).catch(() => {});
        };
        reader.readAsText(file);
        (event.target as HTMLInputElement).value = '';
    }

    #doImport(result: CsvImportResult) {
        const { mappings, rows, initiativeId, leadSourceId } = result;
        const existing = new Set(
            this.prospects().flatMap(p => [p.getName()?.toLowerCase(), p.company()?.toLowerCase()]).filter(Boolean)
        );
        const getField = (row: string[], field: string) => {
            const idx = mappings.findIndex((m: CsvColumnMapping) => m.field === field);
            return idx >= 0 ? (row[idx] ?? '').trim() : '';
        };
        const toImport = rows.filter(row => {
            const org = getField(row, 'org').toLowerCase();
            const fn  = getField(row, 'fn').toLowerCase();
            // skip rows with no usable identity at all
            if (!org && !fn && !getField(row, 'family_name') && !getField(row, 'given_name') && !getField(row, 'email')) return false;
            return (!org || !existing.has(org)) && (!fn || !existing.has(fn));
        });
        const requests = toImport.map(row => {
            const fn         = getField(row, 'fn');
            const familyName = getField(row, 'family_name');
            const givenName  = getField(row, 'given_name');
            const org        = getField(row, 'org');
            const email      = getField(row, 'email');
            const tel        = getField(row, 'tel');
            const url        = getField(row, 'url');
            const location   = getField(row, 'location');
            const role       = getField(row, 'role');
            const notes      = getField(row, 'notes');
            const displayName = fn || (givenName && familyName ? `${givenName} ${familyName}` : familyName || givenName || org || email) || '';
            const vcardLines = [
                'BEGIN:VCARD', 'VERSION:3.0',
                `FN:${displayName}`,
                `N:${familyName || ''};${givenName || ''};;;`,
                `ORG:${org}`, `EMAIL:${email}`, `TEL:${tel}`, `URL:${url}`, `ROLE:${role}`,
                'X-LANG:de', 'X-FORMALITY:formal',
            ];
            if (location) vcardLines.push(`ADR:;;;${location};;;`);
            vcardLines.push('END:VCARD');
            return this.#marketingService.storeProspect({
                name: displayName, vcard: vcardLines.join('\n'), email,
                ...(notes && { notes }),
                status: 'new', added_via: 'import',
                marketing_initiative_id: initiativeId,
                lead_source_id: leadSourceId,
            });
        });
        from(requests).pipe(mergeMap(req => req, 3), toArray()).subscribe(created => {
            this.prospects.update(p => [...created, ...p]);
        });
    }

    #saveFiltersToLocalStorage() {
        localStorage.setItem(this.#STORAGE_KEY, JSON.stringify({
            initiativeFilter: this.initiativeFilter(),
            userFilter: this.userFilter(),
            statusFilters: this.statusFilters().map(f => ({ key: f.key, selected: f.selected })),
        }));
    }

    #restoreFiltersFromLocalStorage() {
        try {
            const saved = localStorage.getItem(this.#STORAGE_KEY);
            if (!saved) return;
            const filters = JSON.parse(saved);
            if (filters.initiativeFilter !== undefined) this.initiativeFilter.set(filters.initiativeFilter);
            if (filters.userFilter !== undefined) this.userFilter.set(filters.userFilter);
            if (Array.isArray(filters.statusFilters)) {
                this.statusFilters.update(current => current.map(f => {
                    const s = filters.statusFilters.find((x: any) => x.key === f.key);
                    return s ? { ...f, selected: s.selected } : f;
                }));
            }
        } catch {}
    }
}
