import { ChangeDetectionStrategy, Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { MarketingService } from '@models/marketing/marketing.service';
import { MarketingProspect } from '@models/marketing/marketing-prospect.model';
import { MarketingProspectActivity } from '@models/marketing/marketing-prospect-activity.model';
import { modelResource } from '@models/http/model-resource';
import { Nx } from '@app/nx/nx.directive';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { MarketingConvertProspectModalComponent } from '../marketing-convert-prospect-modal/marketing-convert-prospect-modal.component';
import { MarketingLinkContactModalComponent } from '../marketing-link-contact-modal/marketing-link-contact-modal.component';
import { VcardComponent } from '@app/customers/_shards/vcard/vcard.component';
import { RteComponent } from '@app/_shards/rte/rte.component';
import { personalized } from '@constants/personalized';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { GlobalService } from '@models/global.service';
import { Dictionary } from '@constants/constants';
import { StackedTableDirective } from '@directives/stacked-table.directive';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'marketing-prospect-detail',
    templateUrl: './marketing-prospect-detail.component.html',
    imports: [StackedTableDirective, DatePipe, FormsModule, NgbTooltipModule, Nx, VcardComponent, ToolbarComponent, RteComponent, RouterLink, SpinnerComponent],
})
export class MarketingProspectDetailComponent {
    #marketingService = inject(MarketingService);
    #route = inject(ActivatedRoute);
    #modal = inject(ModalBaseService);
    #globalService = inject(GlobalService);

    #prospectId = toSignal(this.#route.params.pipe(map(params => params['id'] as string | undefined)));
    #prospectRes = modelResource(this.#prospectId, id => this.#marketingService.showProspect(id));

    prospect        = linkedSignal(() => this.#prospectRes.value());
    isLoading       = this.#prospectRes.isLoading;
    vcardCollapsed  = signal(true);
    selectedActivity = signal<MarketingProspectActivity | undefined>(undefined);
    activities      = linkedSignal(() => this.prospect()?.activities ?? []);

    pendingActivities   = computed(() => this.activities().filter(a => a.status === 'pending'));
    completedActivities = computed(() => this.activities().filter(a => ['completed', 'skipped'].includes(a.status)));

    constructor() {
        this.#globalService.onActionsResolved.pipe(takeUntilDestroyed()).subscribe(({ object }) => {
            if (object instanceof MarketingProspect && String(object.id) === String(this.#prospectId())) this.#prospectRes.reload();
        });
    }

    onActivityActionsResolved = () => this.activities.update(a => [...a]);

    isActivityOverdue = (activity: MarketingProspectActivity) =>
        new Date(activity.scheduled_at) < new Date() && activity.status === 'pending';

    canExecuteQuickAction(activity: MarketingProspectActivity): boolean {
        switch (activity.marketing_activity?.quick_action) {
            case 'EMAIL':         return !!this.#getEmail();
            case 'LINKEDIN':      return !!this.#getLinkedIn();
            case 'LINKEDIN_SEARCH': return true;
            case 'CALL':          return !!this.#getPhone();
            default:              return false;
        }
    }

    executeQuickAction(activity: MarketingProspectActivity): void {
        switch (activity.marketing_activity?.quick_action) {
            case 'EMAIL': {
                const email = this.#getEmail();
                if (!email) return;
                const body = personalized(this.#getEmailBody(activity), this.#getPersonalizations());
                window.location.href = `mailto:${email}?subject=${encodeURIComponent(activity.marketing_activity?.name || '')}&body=${encodeURIComponent(body)}`;
                break;
            }
            case 'LINKEDIN':
                window.open(this.#getLinkedIn()!, '_blank');
                break;
            case 'LINKEDIN_SEARCH': {
                const query = `${this.prospect()?.name() ?? ''} ${this.prospect()?.company() ?? ''}`.trim();
                window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(query)}`, '_blank');
                break;
            }
            case 'CALL':
                window.location.href = `tel:${this.#getPhone()!.replace(/[\s-]/g, '')}`;
                break;
        }
    }

    getQuickActionIcon(qa: string): string {
        return ({ EMAIL: 'email', LINKEDIN: 'open_in_new', LINKEDIN_SEARCH: 'search', CALL: 'phone' } as Dictionary<string>)[qa] || '';
    }

    getLocalizedDescription(activity: MarketingProspectActivity): string {
        const desc = activity.marketing_activity?.description;
        if (!desc) return '';
        if (typeof desc === 'string') return desc;
        const lang = this.prospect()?.getLang() || 'de';
        const formality = this.prospect()?.getFormality() || 'formal';
        return desc.find((v) => v.language === lang && v.formality === formality)?.text
            ?? desc.find((v) => v.language === lang)?.text
            ?? desc[0]?.text ?? '';
    }

    convertProspect() {
        if (!this.prospect()) return;
        this.#modal.open(MarketingConvertProspectModalComponent, { prospect: this.prospect()! })
            .then(result => {
                if (!result) return;
                this.#marketingService.convertProspect(this.prospect()!.id, result).subscribe({
                    next: () => this.#prospectRes.reload(),
                    error: () => alert('Failed to convert prospect. Please try again.'),
                });
            });
    }

    linkToContact() {
        if (!this.prospect()) return;
        this.#modal.open(MarketingLinkContactModalComponent, { prospect: this.prospect()! })
            .then(result => {
                if (!result) return;
                this.#marketingService.updateProspect(this.prospect()!.id, { company_contact_id: result.company_contact_id })
                    .subscribe({
                        next: (updated: MarketingProspect) => this.prospect.set(updated),
                        error: () => alert('Failed to link contact. Please try again.'),
                    });
            });
    }

    unlinkCompany() {
        if (!this.prospect() || !confirm('Unlink this company from the prospect?')) return;
        this.#marketingService.updateProspect(this.prospect()!.id, { company_id: null })
            .subscribe((updated: MarketingProspect) => this.prospect.set(updated));
    }

    #getEmail   = () => this.prospect()?.card()?.get('EMAIL')?.first()?.vals?.[0] || this.prospect()?.company_contact?.card()?.get('EMAIL')?.first()?.vals?.[0] || this.prospect()?.company_contact?.contact?.card()?.get('EMAIL')?.first()?.vals?.[0] || this.prospect()?.email || null;
    #getLinkedIn = () => this.prospect()?.card()?.get('URL')?.first()?.vals?.[0] || this.prospect()?.company_contact?.card()?.get('URL')?.first()?.vals?.[0] || this.prospect()?.company_contact?.contact?.card()?.get('URL')?.first()?.vals?.[0] || this.prospect()?.linkedin_url || null;
    #getPhone   = () => this.prospect()?.card()?.get('TEL')?.first()?.vals?.[0] || this.prospect()?.company_contact?.card()?.get('TEL')?.first()?.vals?.[0] || this.prospect()?.company_contact?.contact?.card()?.get('TEL')?.first()?.vals?.[0] || this.prospect()?.phone || null;

    #getEmailBody(activity: MarketingProspectActivity): string {
        const targetId = String(activity.marketing_initiative_activity_id || activity.marketing_activity?.id || '');
        if (!targetId) return this.getLocalizedDescription(activity);
        const matched = this.activities().find((item) => {
            const id = String(item?.marketing_initiative_activity_id || item?.marketing_initiative_activity?.id || item?.marketing_activity?.id || '');
            return id === targetId;
        });
        return this.getLocalizedDescription(
            matched instanceof MarketingProspectActivity ? matched : (matched ? MarketingProspectActivity.fromJson(matched) : activity)
        );
    }

    #getPersonalizations(): Dictionary<string> {
        const prospect = this.prospect();
        const contact = prospect?.company_contact?.contact;
        const cc = prospect?.company_contact;

        const firstName  = prospect?.firstName()  || cc?.firstName()  || contact?.firstName()  || '';
        const familyName = prospect?.familyName() || cc?.familyName() || contact?.familyName() || '';
        const fullName   = prospect?.fullName()   || cc?.fullName()   || contact?.fullName()   || prospect?.getName() || '';
        const salutation = this.#buildSalutation(firstName, familyName, fullName,
            prospect?.salutation() || cc?.salutation() || contact?.salutation() || '',
            prospect?.gender || cc?.gender || contact?.gender || '');
        const company = prospect?.company() || prospect?.companyModel?.company_name || cc?.company?.getName() || '';
        const email   = this.#getEmail() || '';
        const phone   = this.#getPhone() || '';

        return { salutation, firstName, familyName, fullName, name: fullName, company, companyName: company, email, phone,
                 first_name: firstName, family_name: familyName, full_name: fullName };
    }

    #buildSalutation(firstName: string, familyName: string, fullName: string, rawSalutation: string, gender: string): string {
        const lang     = this.prospect()?.getLang()      || 'de';
        const formality = this.prospect()?.getFormality() || 'formal';

        if (formality === 'informal') {
            const prefix = lang === 'de' ? 'Hallo' : 'Hello';
            const name = firstName || fullName || familyName;
            return name ? `${prefix} ${name},` : `${prefix},`;
        }
        if (lang === 'de') {
            if (familyName) return gender === 'F' ? `Sehr geehrte Frau ${familyName},` : `Sehr geehrter Herr ${familyName},`;
            if (fullName) return `Sehr geehrte/r ${fullName},`;
            if (rawSalutation) return `${rawSalutation},`;
            return 'Sehr geehrte Damen und Herren,';
        }
        const honorific = gender === 'F' ? 'Ms.' : 'Mr.';
        if (familyName) return `Dear ${honorific} ${familyName},`;
        if (fullName) return `Dear ${fullName},`;
        if (rawSalutation) return `Dear ${rawSalutation.replace(/,$/, '')},`;
        return 'Dear Sir or Madam,';
    }
}
