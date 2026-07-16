import { Dictionary } from '@constants/constants';
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
import { Transform, Type } from 'class-transformer';
import { dayjs, Dayjs } from '@constants/dates';
import { IHasAssignees } from '@interfaces/hasAssignees.interface';
import { ConnectionProjects } from './connection-projects.model';
import { getCompanyActions } from './company.actions';
import { IHasMarker } from '@enums/marker';
import { Model } from '@constants/type-discriminators';
import { computed } from '@angular/core';
import type { BillingConsideration, ProjectTimelineEntry } from '@models/api-response';

const RemarketingIntervals = { 1: 1, 4: 7, 5: 14, 2: 30, 6: 60, 7: 90, 8: 180, 3: 360 } as Record<number, number>;

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
    // Read-only projections attached by stats endpoints (remarketing, customer-stats). Not DB columns, so payloadFor() never sends them back.
    revenue_12?: number;
    revenue_last_1_year: number = 0;
    revenue_total: number = 0;
    earliest_invoice?: { created_at: string };
    remarketing_interval?: number;
    remarketing_due_at?: string;
    desicion_duration?: number;
    billing_considerations?: BillingConsideration[];
    quote_acceptance_rate?: number | null;
    avg_payment_days?: number | null;
    debrief_problem_count?: number;
    debrief_positive_count?: number;
    timeline_chart?: ProjectTimelineEntry[] = [];
    // Read-only projections attached by the churn-risk widget endpoint (companies/churn-risk).
    // Not DB columns, so payloadFor() never sends them back. Precomputed on the backend
    // (Company::getMlChurnProbability12mAttribute() & co.) rather than derived from `params`,
    // since the params dict isn't loaded on this lightweight listing.
    ml_churn_probability_12m?: number;
    // Date-only string (Y-m-d) — see Company::getMlPredictedNextPurchaseDateAttribute() on the
    // backend. Deliberately not the same key as the Carbon-typed accessor, to avoid the
    // toArray()/UTC date-shift pitfall (see frontend/CLAUDE.md's date-range note).
    ml_predicted_next_purchase_date?: string;
    ml_overdue_for_contact?: boolean;
    // Read-only projection appended by GET_CASHFLOW_CUSTOMER_SUPPORT (widget-customer-support) —
    // same "not a DB column, precomputed accessor, params dict not loaded" reasoning as
    // ml_churn_probability_12m above. Use the mlPredictedSupportHours() computed on the
    // single-company detail view instead, where `params` IS loaded.
    ml_predicted_support_hours?: number;
    marker: number | null = null;
    @Transform(({ value }) => Company.toSource(value), { toClassOnly: true }) source?: CompanyContact | User | LeadSource;

    hasTimeBudget!: () => boolean;
    frontendUrl = (): string => `/customers/${this.id}`;
    companyId = (): string => this.id;
    lastUpdateDuration = () => dayjs().diff(dayjs(this.updated_at), 'days');
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

    // ML predictions (Rubix ML) — stored as per-company FloatParams by
    // cron:refresh-customer-predictions, read the same way as STATS_LINREG_FORECAST_12M.
    // Additive to the existing linreg forecast; never replaces it.
    mlPredictedRevenue12m = computed((): number | undefined => this.getFloatParam('ML_PREDICTED_REVENUE_12M'));
    mlPredictedIntervalDays = computed((): number | undefined => this.getFloatParam('ML_PREDICTED_INTERVAL_DAYS'));
    mlChurnProbability12m = computed((): number | undefined => this.getFloatParam('ML_CHURN_PROBABILITY_12M'));
    /** Predicted support hours over the next quarter (support-load forecast). */
    mlPredictedSupportHours = computed((): number | undefined => this.getFloatParam('ML_PREDICTED_SUPPORT_HOURS'));

    /** Predicted next-purchase date = latest invoice date + predicted interval (Model B). */
    mlPredictedNextPurchaseAt = computed((): Dayjs | undefined => {
        const interval = this.mlPredictedIntervalDays();
        if (interval === undefined) return undefined;
        const last = this.invoices
            .map((i) => dayjs(i.created_at))
            .sort((a, b) => b.valueOf() - a.valueOf())[0];
        return last ? last.add(Math.round(interval), 'day') : undefined;
    });

    /** True once the predicted next-purchase date is in the past — "contact now". */
    mlOverdueForContact = computed((): boolean => {
        const next = this.mlPredictedNextPurchaseAt();
        return next !== undefined && next.isBefore(dayjs());
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

    static toSource(_?: Dictionary): CompanyContact | User | LeadSource | undefined {
        if (!_) return undefined;
        if (_.class === 'CompanyContact') return CompanyContact.fromJson(_);
        if (_.class === 'User') return User.fromJson(_);
        if (_.class === 'LeadSource') return LeadSource.fromJson(_);
        return undefined;
    }

    setSource(_?: Dictionary) {
        const source = Company.toSource(_);
        if (source) this.source = source;
    }

    importImprint = () => NxGlobal.getService<CompanyService>(CompanyService).importImprint(this);

    static iconForId = (id: string) => environment.envApi + `companies/${id}/icon`;
}
