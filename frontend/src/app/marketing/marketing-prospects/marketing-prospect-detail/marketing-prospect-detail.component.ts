import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { MarketingService } from '@models/marketing/marketing.service';
import { MarketingProspect } from '@models/marketing/marketing.prospect.model';
import { SearchService } from '@models/search.service';
import { NexusModule } from 'src/app/nx/nexus.module';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { MarketingConvertProspectModalComponent } from '../marketing-convert-prospect-modal/marketing-convert-prospect-modal.component';
import { MarketingLinkContactModalComponent } from '../marketing-link-contact-modal/marketing-link-contact-modal.component';
import { MarketingProspectActivity } from '@models/marketing/marketing-prospect-activity.model';
import { VcardComponent } from '@app/customers/_shards/vcard/vcard.component';

@Component({
    selector: 'marketing-prospect-detail',
    templateUrl: './marketing-prospect-detail.component.html',
    styleUrls: ['./marketing-prospect-detail.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, NgbTooltipModule, NexusModule, VcardComponent, ToolbarComponent]
})
export class MarketingProspectDetailComponent implements OnInit {

    #marketingService = inject(MarketingService);
    #searchService = inject(SearchService);
    #route = inject(ActivatedRoute);
    #modal = inject(ModalBaseService);

    prospect?: MarketingProspect;
    isLoading = true;
    vcardCollapsed = true;

    // Link search
    companyMatches: any[] = [];
    contactMatches: any[] = [];
    selectedCompanyId: number | null = null;
    selectedContactId: number | null = null;

    ngOnInit() {
        this.#route.params.subscribe(params => {
            if (params['id']) {
                this.#loadProspectDetails(params['id']);
            }
        });
    }

    #loadProspectDetails(id: string) {
        this.isLoading = true;
        this.#marketingService.showProspect(id)
            .subscribe((prospect: MarketingProspect) => {
                this.prospect = prospect;
                this.isLoading = false;
                if (!prospect.company_contact_id && !prospect.company_id) {
                    this.#searchForMatches(prospect);
                }
            });
    }

    #searchForMatches(prospect: MarketingProspect) {
        if (prospect.name) {
            this.#searchService.search(prospect.name, { only: 'Contact,CompanyContact' })
                .subscribe((response: any) => {
                    this.contactMatches = (response || []).slice(0, 5);
                });
        }

        if (prospect.company) {
            this.#searchService.search(prospect.company, { only: 'Company' })
                .subscribe((response: any) => {
                    this.companyMatches = (response || []).slice(0, 5);
                });
        }
    }

    openLinkedInProfile(prospect: MarketingProspect) {
        if (prospect.linkedin_url) {
            window.open(prospect.linkedin_url, '_blank');
        }
    }

    getStatusBadgeClass = (status: string): string => {
        switch (status) {
            case 'new': return 'text-info';
            case 'engaged': return 'text-cyan';
            case 'converted': return 'text-success';
            case 'unresponsive': return 'text-warning';
            case 'disqualified': return 'text-danger';
            case 'on_hold': return 'text-secondary';
            default: return 'text-secondary';
        }
    }

    getActivityStatusBadgeClass = (status: string): string => {
        switch (status) {
            case 'pending': return 'text-warning';
            case 'completed': return 'text-success';
            case 'skipped': return 'text-secondary';
            case 'overdue': return 'text-danger';
            case 'failed': return 'text-danger';
            default: return 'text-secondary';
        }
    }

    getPendingActivities = (): MarketingProspectActivity[] => {
        const activities = this.prospect?.activities?.filter((a: any) => a.status === 'pending') || [];
        return activities.map(a => MarketingProspectActivity.fromJson(a));
    }

    getCompletedActivities = (): MarketingProspectActivity[] => {
        const activities = this.prospect?.activities?.filter((a: any) => ['completed', 'skipped'].includes(a.status)) || [];
        return activities.map(a => MarketingProspectActivity.fromJson(a));
    }

    onActivityActionsResolved = () => {
        // Reload prospect details to refresh the activity lists
        if (this.prospect?.id) {
            this.#loadProspectDetails(this.prospect.id);
        }
    }

    isActivityOverdue = (activity: MarketingProspectActivity): boolean => new Date(activity.scheduled_at) < new Date() && activity.status === 'pending';

    // Quick Action Methods
    canExecuteQuickAction(activity: MarketingProspectActivity): boolean {
        if (!activity.marketing_activity?.quick_action) return false;
        switch (activity.marketing_activity.quick_action) {
            case 'EMAIL': return !!this.getProspectEmail();
            case 'LINKEDIN': return !!this.getProspectLinkedIn();
            case 'LINKEDIN_SEARCH': return true;
            case 'CALL': return !!this.getProspectPhone();
            default: return false;
        }
    }

    getProspectEmail(): string | null {
        return this.prospect?.card?.get('EMAIL')?.first()?.vals?.[0]
            || this.prospect?.company_contact?.card?.get('EMAIL')?.first()?.vals?.[0]
            || this.prospect?.company_contact?.contact?.card?.get('EMAIL')?.first()?.vals?.[0]
            || this.prospect?.email || null;
    }

    getProspectLinkedIn(): string | null {
        return this.prospect?.card?.get('URL')?.first()?.vals?.[0]
            || this.prospect?.company_contact?.card?.get('URL')?.first()?.vals?.[0]
            || this.prospect?.company_contact?.contact?.card?.get('URL')?.first()?.vals?.[0]
            || this.prospect?.linkedin_url || null;
    }

    getProspectPhone(): string | null {
        return this.prospect?.card?.get('TEL')?.first()?.vals?.[0]
            || this.prospect?.company_contact?.card?.get('TEL')?.first()?.vals?.[0]
            || this.prospect?.company_contact?.contact?.card?.get('TEL')?.first()?.vals?.[0]
            || this.prospect?.phone || null;
    }

    executeQuickAction(activity: MarketingProspectActivity): void {
        const qa = activity.marketing_activity?.quick_action;
        switch (qa) {
            case 'EMAIL': {
                const email = this.getProspectEmail();
                const subject = activity.marketing_activity?.name || 'Regarding Our Recent Outreach';
                const body = this.getLocalizedDescription(activity);
                window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                break;
            }
            case 'LINKEDIN':
                window.open(this.getProspectLinkedIn()!, '_blank');
                break;
            case 'LINKEDIN_SEARCH': {
                const name = this.prospect?.name || '';
                const company = this.prospect?.company || '';
                const query = `${name} ${company}`.trim();
                window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`, '_blank');
                break;
            }
            case 'CALL':
                window.location.href = `tel:${this.getProspectPhone()!.replace(/[\s-]/g, '')}`;
                break;
        }
    }

    getQuickActionIcon(qa: string): string {
        const icons: Record<string, string> = { EMAIL: 'email', LINKEDIN: 'open_in_new', LINKEDIN_SEARCH: 'search', CALL: 'phone' };
        return icons[qa] || '';
    }

    getLocalizedDescription(activity: MarketingProspectActivity): string {
        const desc = activity.marketing_activity?.description;
        if (!desc) return '';
        if (typeof desc === 'string') return desc;

        // Get prospect's language and formality preferences
        const lang = this.prospect?.getLang() || 'de';
        const formality = this.prospect?.getFormality() || 'formal';

        // Find matching variant
        const variant = desc.find((v: { language: string; formality: string; text: string }) => v.language === lang && v.formality === formality);
        if (variant) return variant.text;

        // Fallback: try same language with any formality
        const langVariant = desc.find((v: { language: string; formality: string; text: string }) => v.language === lang);
        if (langVariant) return langVariant.text;

        // Fallback: return first available
        return desc[0]?.text || '';
    }

    markActivityCompleted(activity: MarketingProspectActivity, notes?: string) {
        if (!this.prospect) return;

        this.#marketingService.updateProspectActivityStatus(
            this.prospect.id,
            activity.id,
            { status: 'completed', notes }
        ).subscribe((updated: MarketingProspectActivity) => {
            if (this.prospect?.activities) {
                const index = this.prospect.activities.findIndex(a => a.id === activity.id);
                if (index !== -1) {
                    this.prospect.activities[index] = updated;
                }
            }
        });
    }

    markActivitySkipped(activity: MarketingProspectActivity, reason?: string) {
        if (!this.prospect) return;

        this.#marketingService.updateProspectActivityStatus(
            this.prospect.id,
            activity.id,
            { status: 'skipped', notes: reason }
        ).subscribe((updated: MarketingProspectActivity) => {
            if (this.prospect?.activities) {
                const index = this.prospect.activities.findIndex(a => a.id === activity.id);
                if (index !== -1) {
                    this.prospect.activities[index] = updated;
                }
            }
        });
    }

    linkToCompany() {
        if (!this.prospect || !this.selectedCompanyId) return;

        this.#marketingService.linkToCompany(this.prospect.id, `${this.selectedCompanyId}`).subscribe((updated: any) => {
            this.prospect = MarketingProspect.fromJson(updated);
            this.selectedCompanyId    = null;
            this.companyMatches       = [];
            this.contactMatches       = [];
        });
    }

    linkToContact() {
        if (!this.prospect) return;

        this.#modal.open(MarketingLinkContactModalComponent, { prospect: this.prospect }).then(result => {
            if (!result) return;

            this.#marketingService.updateProspect(this.prospect!.id, {
                company_contact_id: result.company_contact_id
            }).subscribe({
                next: (updated: MarketingProspect) => {
                    this.prospect = updated;
                    this.selectedContactId = null;
                    this.companyMatches = [];
                    this.contactMatches = [];
                },
                error: (error: any) => {
                    console.error('Link failed:', error);
                    alert('Failed to link contact. Please try again.');
                }
            });
        }).catch();
    }

    unlinkContact() {
        if (!this.prospect) return;

        if (!confirm('Unlink this contact from the prospect?')) return;

        this.#marketingService.updateProspect(this.prospect.id, {
            company_contact_id: null
        }).subscribe((updated: MarketingProspect) => {
            this.prospect = updated;
        });
    }

    unlinkCompany() {
        if (!this.prospect) return;

        if (!confirm('Unlink this company from the prospect?')) return;

        this.#marketingService.updateProspect(this.prospect.id, {
            company_id: null
        }).subscribe((updated: MarketingProspect) => {
            this.prospect = updated;
        });
    }

    convertProspect() {
        if (!this.prospect) return;

        this.#modal.open(MarketingConvertProspectModalComponent, { prospect: this.prospect }).then(result => {
            if (!result) return;

            this.#marketingService.convertProspect(this.prospect!.id, result).subscribe({
                next: () => {
                    if (this.prospect?.id) {
                        this.#loadProspectDetails(this.prospect.id);
                    }
                },
                error: (error: any) => {
                    console.error('Conversion failed:', error);
                    alert('Failed to convert prospect. Please try again.');
                }
            });
        }).catch();
    }
}
