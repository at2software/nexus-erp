import { CompanyService } from '@models/company/company.service';
import { CompanyContact } from './company-contact.model';
import { Project } from '../project/project.model';
import { Serializable } from '../serializable';
import { VcardClass } from '../vcard/VcardClass';
import { Invoice } from '../invoice/invoice.model';
import { NxGlobal } from '@app/nx/nx.global';
import { InvoiceItem } from '../invoice/invoice-item.model';
import { HasInvoiceItems } from '@interfaces/hasInvoiceItems.interface';
import { File } from '../file/file.model';
import { IHasFiles } from '../file/has_files.interface';
import { Assignee } from '../assignee/assignee.model';
import { Focus } from '../focus/focus.model';
import { environment } from 'src/environments/environment';
import { IHasFoci } from '@models/focus/hasFoci.interface';
import { User } from '@models/user/user.model';
import { LeadSource } from '@models/project/lead_source.model';
import { Type } from 'class-transformer';
import moment from 'moment';
import { IHasAssignees } from '@interfaces/hasAssignees.interface';
import { ConnectionProjects } from './connection-projects.model';
import { getCompanyActions } from './company.actions';
import { IHasMarker } from '@enums/marker';
import { Model } from '@constants/type-discriminators';
import { computed } from '@angular/core';

const RemarketingIntervals = { 1: 1, 4: 7, 5: 14, 2: 30, 6: 60, 7: 90, 8: 180, 3: 360 } as Record<number, number>;
export interface TBillingConsideration {
    type: 'warning' | 'error';
    label: string;
    tooltip: string;
    project_id?: string;
    uninvoiced_hours?: number;
    invoice_item_id?: string;
}

@Model('Company')
export class Company extends VcardClass implements HasInvoiceItems, IHasFiles, IHasFoci, IHasAssignees, IHasMarker {
    static override API_PATH = (): string => 'companies';
    override SERVICE = CompanyService;
    protected override readonly computedIcon = computed(() => environment.envApi + `companies/${this.id}/icon`);
    override readonly ngLink = computed(() => `/customers/${this.id}`);

    default_product_id: string = '';
    customer_number: string = '';
    value: number = 0;
    project_count: number = 0;
    running_project_count: number = 0;
    unpaid_invoice_count: number = 0;
    invoice_count: number = 0;
    revenue: number = 0;
    address: string = '';
    vat_id: string = '';
    managing_director: string = '';
    commercial_register: string = '';
    invoice_items: InvoiceItem[] = [];
    net: number = 0;
    net_remaining: number = 0;
    invoice_correction: string = '';
    invoice_email: string = '';
    has_direct_debit: boolean = false;
    is_deprecated: boolean = false;
    lat: number | null = null;
    lon: number | null = null;
    requires_po: boolean = false;
    has_nda: boolean = false;
    accepts_support: boolean = false;
    needs_vat_handling?: boolean = true;
    foci_unbilled_sum_duration?: number;
    invoices_last12m_sum_net?: number;
    total_time?: number;
    remarketing_interval?: number;
    desicion_duration?: number;
    billing_considerations?: TBillingConsideration[];
    quote_acceptance_rate?: number | null;
    avg_payment_days?: number | null;
    marker: number | null = null;
    source?: CompanyContact | User | LeadSource;

    hasTimeBudget!: () => boolean;
    frontendUrl = (): string => `/customers/${this.id}`;
    companyId = (): string => this.id;
    lastUpdateDuration = () => moment().diff(moment(this.updated_at), 'days');
    isVatExcempt = computed(() => (this.snapshot().vat_id?.length ?? 0) > 0);
    vatRate = computed(() => this.isVatExcempt() || !this.isEuropeanCountry() ? 0 : NxGlobal.global.user!.getFloatParam('VAT_RATE', 19)!);
    remarketingDays = computed(() => RemarketingIntervals[this.snapshot().remarketing_interval] ?? 0);    
    assignedUsers = computed((): Assignee[] => this.assignees.filter((_) => _.assignee instanceof User));
    
    acceptedChildren = computed((): (typeof Serializable)[] => [Project, InvoiceItem, Invoice, Focus]);
    getLocale = computed((): string => {
        const card = this.card();
        const lang = card?.first('X-LANG')?.vals[0] || 'de';
        const formality = card?.first('X-FORMALITY')?.vals[0] || 'formal';
        return `${lang}-${formality}`;
    });
    averagePaymentDelay = computed((): number => {
        const paid = this.invoices.filter((i) => i.paid_at);
        if (paid.length === 0) return 0;
        return paid.reduce((sum, i) => sum + i.time_paid().diff(i.time_due(), 'days'), 0) / paid.length;
    });
    remarketingProgress = computed(() => {
        const days = this.remarketingDays();
        return days === 0 ? 0 : this.lastUpdateDuration() / days;
    });

    doubleClickAction: number = 0;
    actions = getCompanyActions(this);

    @Type(()=>Assignee) pivot!: Assignee;
    @Type(()=>Project) projects_unfinished!: Project[];
    @Type(()=>Project) base_projects!: Project[];
    @Type(()=>CompanyContact) employees!: CompanyContact[];
    @Type(()=>Invoice) invoices!: Invoice[];
    @Type(()=>File) files!: File[];
    @Type(()=>Assignee) assignees!: Assignee[];
    @Type(()=>InvoiceItem) upcoming_repeating_invoice_items!: InvoiceItem[];
    @Type(()=>Focus) foci!: Focus[];
    @Type(()=>ConnectionProjects) available_connections?: ConnectionProjects[];

    setParent = (_: Serializable) => console.error('setParent() not allowed for companies');

    setSource(_?: any) {
        if (!_) return;
        if (_.class === 'CompanyContact') this.source = CompanyContact.fromJson(_);
        if (_.class === 'User') this.source = User.fromJson(_);
        if (_.class === 'LeadSource') this.source = LeadSource.fromJson(_);
    }

    importImprint = () => NxGlobal.getService<CompanyService>(CompanyService).importImprint(this);

    static iconForId = (id: string) => environment.envApi + `companies/${id}/icon`;
}
