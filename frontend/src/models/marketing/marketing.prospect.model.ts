import { VcardClass } from '@models/vcard/VcardClass';
import { Serializable } from '../serializable';
import { MarketingService } from './marketing.service';
import { NxActionType } from 'src/app/nx/nx.actions';
import { AutoWrap, AutoWrapArray } from '@constants/autowrap';
import { CompanyContact } from '@models/company/company-contact.model';
import { User } from '@models/user/user.model';
import { LeadSource } from '@models/project/lead_source.model';
import { MarketingProspectActivity } from './marketing-prospect-activity.model';
import { MarketingInitiative } from './marketing-initiative.model';
import { IHasMarker, Marker } from 'src/enums/marker';

export class MarketingProspect extends VcardClass implements IHasMarker {

    SERVICE = MarketingService;

    email!: string;
    user_id!: number;
    linkedin_url?: string;
    position?: string;
    phone?: string;
    notes?: string;
    company_id?: string;
    company_contact_id?: string;
    companyModel?: any;
    company?: string;
    status!: 'new' | 'engaged' | 'converted' | 'unresponsive' | 'disqualified' | 'on_hold';
    added_via!: 'addon' | 'manual' | 'import';
    has_overdue_activities?: boolean;
    marker: number | null = null;

    readonly #inactiveStatuses = ['unresponsive', 'disqualified', 'on_hold'];

    override markerClass = (): string => {
        if (this.#inactiveStatuses.includes(this.status)) return ''
        return this.marker !== null && Marker[this.marker as number] ? `marker marker-${Marker[this.marker as number]}` : ''
    }

    @AutoWrap('CompanyContact') company_contact?: CompanyContact;
    @AutoWrap('User') user?: User;
    @AutoWrap('LeadSource') lead_source?: LeadSource;
    @AutoWrap('MarketingInitiative') marketing_initiative?: MarketingInitiative;
    @AutoWrapArray('MarketingProspectActivity') activities?: MarketingProspectActivity[];

    doubleClickAction = 0;
    actions = [
        {
            title: $localize`:@@i18n.common.open:open`,
            action: () => this.navigate(`/marketing/prospects`)
        },
        {
            title: $localize`:@@i18n.marketing.open_linkedin:Open LinkedIn`,
            on: () => !!this.linkedin_url,
            action: () => {
                if (this.linkedin_url) window.open(this.linkedin_url, '_blank');
            }
        },
        {
            title: $localize`:@@i18n.marketing.mark_status:Mark...`,
            group: true,
            children: [
                {
                    title: $localize`:@@i18n.marketing.mark_new:Mark New`,
                    group: true,
                    on: () => this.status !== 'new',
                    action: () => this.mark('new')
                },
                {
                    title: $localize`:@@i18n.marketing.mark_engaged:Mark Engaged`,
                    group: true,
                    on: () => this.status !== 'engaged',
                    action: () => this.mark('engaged')
                },
                {
                    title: $localize`:@@i18n.marketing.mark_converted:Mark Converted`,
                    group: true,
                    on: () => this.status !== 'converted',
                    action: () => this.mark('converted')
                },
                {
                    title: $localize`:@@i18n.marketing.mark_unresponsive:Mark Unresponsive`,
                    group: true,
                    on: () => this.status !== 'unresponsive',
                    action: () => this.mark('unresponsive')
                },
                {
                    title: $localize`:@@i18n.marketing.mark_disqualified:Mark Disqualified`,
                    group: true,
                    on: () => this.status !== 'disqualified',
                    action: () => this.mark('disqualified')
                },
                {
                    title: $localize`:@@i18n.marketing.mark_on_hold:Mark On Hold`,
                    group: true,
                    on: () => this.status !== 'on_hold',
                    action: () => this.mark('on_hold')
                },

            ]
        },
        {
            title: $localize`:@@i18n.common.delete:delete`,
            group: true,
            type: NxActionType.Destructive,
            action: () => this.confirm().then(() => this.httpService.delete(`marketing/prospects/${this.id}`).subscribe()),
            hotkey: 'DEL',
            roles: 'marketing'
        }
    ];

    static API_PATH = (): string => 'marketing/prospects';
    static DB_TABLE_NAME = (): string => 'marketing_prospects';

    mark = (state:string) => this.httpService.put(`marketing/prospects/${this.id}`, { status: state })
    
    override _serialize(json: any) {
        const existingActivities = this.activities?.length ? this.activities : undefined;
        super._serialize(json);
        if (existingActivities && json && !('activities' in json)) {
            this.activities = existingActivities;
        }
        return this;
    }

    serialize = () => {
        super.serialize({});

        // For converted prospects, get data from company_contact relationships
        // Otherwise, get it from the prospect's own vcard
        if (this.company_contact_id && this.company_contact) {
            const linkedContact = this.company_contact.contact;

            // Get name from contact
            if (linkedContact?.card) {
                const fn = linkedContact.card.get('FN')?.first()?.vals?.join('');
                if (fn) this.name = fn;
            }

            this.firstName = linkedContact?.firstName || this.firstName;
            this.familyName = linkedContact?.familyName || this.familyName;
            this.fullName = linkedContact?.fullName || this.fullName || this.name || '';

            // Get company from company
            if (this.company_contact.company?.card) {
                this.company = this.company_contact.company.card.get('ORG')?.map(_ => _.vals.join(' ')).join(', ');
            }
        } else {
            // Use prospect's own vcard
            this.company = this.card.get('ORG')?.map(_ => _.vals.join(' ')).join(', ');
        }

        this.fullName = (this.fullName || this.name || '').trim();

        if ((!this.firstName || !this.familyName) && this.fullName) {
            const parts = this.fullName.split(/\s+/).filter(Boolean);
            if (!this.firstName && parts.length > 0) {
                this.firstName = parts[0];
            }
            if (!this.familyName && parts.length > 1) {
                this.familyName = parts.slice(1).join(' ');
            }
        }
    }

}

export class MarketingProspectStats extends Serializable {

    static API_PATH = (): string => 'marketing_prospects';
    SERVICE = MarketingService;

    total!: number;
    by_status!: {
        new: number;
        engaged: number;
        converted: number;
    };
    activities_pending!: number;
    activities_overdue!: number;
}

// Supporting interfaces
export interface LeadSourceChannel {
    id: number;
    name: string;
    pivot: {
        is_primary: boolean;
        custom_settings?: any;
    };
}
