import { Dictionary } from '@constants/constants';
import type { Dayjs } from '@constants/dates';
import type { Milestone } from './milestones/milestone.model';
import type { Task } from './tasks/task.model';
import type { Encryption } from './encryption/encryption.model';
import type { Company } from './company/company.model';
import type { Project } from './project/project.model';
import type { User } from './user/user.model';
import type { Product } from './product/product.model';
import type { CompanyContact } from './company/company-contact.model';
import type { UserEmployment } from './user/user-employment.model';
import type { ProjectState } from './project/project-state.model';
import type { LeadSource } from './project/lead_source.model';
import type { Expense } from './expense/expense.model';
import type { INxContextMenu } from '@app/nx/nx.contextmenu.interface';

// Dual-use base: extended by ParamChartPoint but also imported directly (projects-stats.component.ts) — keep exported
export interface XYPoint<TX = string | number> {
    x: TX;
    y: number;
}

export interface ParamChartPoint extends XYPoint<string> {
    min: number;
    max: number;
}
export interface JubileeEntry {
    name: string; next: Dayjs; label: string; type: number; path: string;
}
export interface MilestonesResponse {
    milestones: Milestone[];
    project_tasks: Task[];
}

export interface ConvertResponse {
    milestones_created: number;
}

export interface ParamChartSeries {
    name: string;
    current?: number;
    data: ParamChartPoint[];
}
export interface CashflowSeries<T = unknown> {
    objects: T[];
    history?: ParamChartSeries[]
}

// Internal to SankeyData — not exported, confirm no external import before re-exporting
interface SankeyNode {
    id: number;
    name: string;
    color: string;
    is_finished?: boolean;
}

interface SankeyLink {
    source: number;
    target: number;
    count: number;
    net: number;
}

export interface SankeyData {
    nodes: SankeyNode[];
    links: SankeyLink[];
}

// Generic period/value time-series row — backend normalizes domain-specific key names (revenue, sum, bias_factor, ...) onto this shape
export type TimeValuePoint<TExtra extends object = object> = { period: string; value: number } & TExtra;

export interface WorkInfoEntry {
    key: string;
    day: string;
    value: number;
    class: string;
    required: number;
}

export interface WorkingTimeResponse {
    workinfo: WorkInfoEntry[];
    data: { key: string; value: number }[];
    work_this_week: number;
    required_work_this_week: number;
    required_hours: number;
    average: number;
}

export interface RevenueEntry {
    sum: number;
    month?: string;
}

export interface RevenueMonthEntry {
    sum: number;
    month: string;
}

export interface InvoiceOverallEntry {
    year: number;
    sum: number;
}

export interface InvoiceOverallResponse {
    current: InvoiceOverallEntry[];
}

export interface CustomerRevenueScatterAxes {
    cross_sell_ratio: number;
    customer_age: number;
    lifetime_revenue: number;
    project_count: number;
    months_since_last: number;
}

export interface CustomerRevenueScatterPoint {
    id: number;
    name: string;
    new_revenue: number;
    followup_revenue: number;
    total_revenue: number;
    customer_age_months: number;
    initial_group_id: number;
    initial_group_name: string;
    initial_group_color: string;
    x: CustomerRevenueScatterAxes;
}

export interface CustomerRevenueScatterResponse {
    points: CustomerRevenueScatterPoint[];
}

export interface RevenueCurrentYearResponse {
    revenue: number;
    expenses: number;
    current: RevenueEntry[];
    last: RevenueMonthEntry[];
    revenue12?: RevenueMonthEntry[];
}

export interface LinearRegressionData {
    current: { forecast: number; r2: number; standard_error: number; formula: string; generated_at: string };
    historical_data: { date: string; forecast: number; r2: number; standard_error: number; annual_expenses: number; revenue_12?: number }[];
    meta: { data_points: number; date_range: { from: string; to: string } };
}

export interface PluginEntry extends Encryption {
    type: string;
    displayName: string;
}

export interface Holiday {
    date: Dayjs;
    datum: string;
    hinweis: string;
    name: string;
}

export interface GitlabProject {
    id: number;
    name: string;
    path_with_namespace: string;
    default_branch?: string;
}

export interface QuoteAccuracyPoint { net: number; average: number; stddev: number; }
export interface QuoteAcceptanceSignalPoint { x: number; y: number; count: number; }
export interface QuoteAcceptanceSignalCurveResponse { signal: string; points: QuoteAcceptanceSignalPoint[]; }
export interface EchartsSeries { name: string; data?: unknown[]; areaStyle?: object; [key: string]: unknown; }
export interface TooltipParams { color: string; seriesName: string; value: [string | number, number]; }
export interface StatsData {
    svb?: { series: EchartsSeries[]; chart: { height: number; stacked?: boolean }; [key: string]: unknown };
    quote_accuracy?: object;
    quote_acceptance_signal?: object;
    product_mix?: object;
    revenue_by_group?: object;
    finished_timeline?: object;
    success_rate?: object;
}

export interface ParticipatingCompany {
    id: number;
    connection_id: string;
    other_company: Company;
    project_count: number;
}

export type MonthlyBiasData = TimeValuePoint<{ projects_count: number }>;

export interface DebriefStats {
    total_debriefs: number;
    completed_debriefs: number;
    draft_debriefs: number;
    total_problems_recorded: number;
    avg_problems_per_debrief: number;
    avg_solution_effectiveness: number;
    total_unique_problems: number;
    total_unique_solutions: number;
}

// Template only — not exported, exists so CategoryBreakdown/CategoryBreakdownPositives can extend it
interface CategoryMeta {
    category_id: string;
    category_name: string;
    category_color: string;
    category_icon: string;
}

// Template only — not exported, mirrors the backend's ->only(['id','name','icon']) / Company::onlyAvatar() projection
interface AvatarRef {
    id: string;
    name: string;
    icon: string;
}

export interface ProblemSummary {
    id: string;
    title: string;
    severity?: string;
    usage_count?: number;
    projects?: AvatarRef[];
}

export interface CategoryBreakdown extends CategoryMeta {
    total_problems: number;
    severity_counts: { low: number; medium: number; high: number; critical: number };
    weighted_score: number;
    problems?: ProblemSummary[];
}

export interface CategoryBreakdownPositives extends CategoryMeta {
    total_positives: number;
}

export interface TrendData {
    month: string;
    debriefs_count: number;
    problems_count: number;
}

// Raw shape by default (Dictionary); callers pass model types as generics to describe the hydrated result (see DebriefService)
export interface DebriefStatsResponse<TProblem = Dictionary, TSolution = Dictionary, TPositive = Dictionary, TCustomer = Dictionary> {
    aggregated?: DebriefStats;
    categories?: CategoryBreakdown[];
    categories_positives?: CategoryBreakdownPositives[];
    top_problems?: TProblem[];
    top_solutions?: TSolution[];
    top_positives?: TPositive[];
    trends?: TrendData[];
    top_customers_worst?: TCustomer[];
    top_customers_best?: TCustomer[];
}

export interface TeamMemberData {
    encryptions?: Encryption[];
}

export interface DataLabelFormatterContext {
    seriesIndex: number;
    dataPointIndex: number;
    w: { config: { series: { name: string }[] } };
}

export interface ChartAxisTooltipParam {
    axisValue?: string;
    value?: number;
    color?: string;
    seriesName?: string;
}

export interface ProductStatisticsTimelineEntry {
    group_id: number;
    group_name: string;
    group_color?: string;
    total_net: string | number;
}

// Backend attaches ranking-specific computed fields directly onto each Product row (not under `.var`).
export interface ProductStatistics {
    top_products: (Product & { total_revenue?: number })[];
    fastest_sellers: (Product & { average_sales_speed?: number })[];
    most_repurchased: (Product & { average_repurchase_frequency?: number })[];
    timeline: Record<string, ProductStatisticsTimelineEntry[]>;
}

export interface ProjectProductMixGroup {
    id: number;
    name: string;
    color?: string;
    count: number;
    net: number;
}

export interface ProjectProductMixTimelineEntry {
    period: string;
    groups: Record<string, { count: number; net: number }>;
}

export interface ProjectProductMixResponse {
    total: number;
    groups: ProjectProductMixGroup[];
    unassigned: { count: number; net: number };
    timeline: ProjectProductMixTimelineEntry[];
}

export interface ProjectSuccessRateResponse {
    successful: number;
    unsuccessful: number;
}

/** One "what would move the needle" suggestion from App\ML\ProjectQuoteWhatIf. */
export interface QuoteAcceptanceSuggestion {
    feature: 'item_count' | 'net' | 'discount_pct' | 'prefix_length';
    from: number;
    to: number;
    delta: number;
    new_probability: number;
}

/** Response of App\Services\Project\ProjectQuoteAcceptanceService::build() — always computed on demand, never persisted. */
export interface QuoteAcceptancePrediction {
    probability: number | null;
    decided: boolean;
    actual_outcome: boolean | null;
    features: {
        item_count: number;
        net: number;
        discount_pct: number;
        prefix_length: number;
        days_pending: number;
        company_acceptance_rate: number | null;
        company_prior_decided_count: number;
    };
    suggestions: QuoteAcceptanceSuggestion[];
}

export interface ProductSplitItem {
    id: number;
    text: string;
    project_name?: string;
    selectedProduct?: Product | null;
    product_source_id?: number | string | null;
}

export interface AISuggestion {
    name: string;
    itemIds?: number[];
}

export interface LoginResponse {
    user?: { id: string; api_token?: string };
}

export interface BankLookupResponse {
    url?: string;
    name?: string;
}

export interface ParamValueResponse {
    value?: string;
}

export interface TbeRow {
    month: string;
    type: number;
    duration: number;
    excluded: number;
    raw: number;
    vacation: number;
    description: string;
}

export interface TimeBasedEmploymentInfo {
    tbe_projects?: Dictionary[];
    tbe_table?: TbeRow[];
    employments: UserEmployment[];
    roles: { name: string }[];
}

export interface RemarketingResponse {
    due?: Company[];
    observed?: Company[];
    suggested?: Company[];
}

export interface ProspectStats {
    total?: number;
    by_status?: {
        new?: number;
        engaged?: number;
        converted?: number;
        unresponsive?: number;
        disqualified?: number;
        on_hold?: number;
    };
    activities_pending?: number;
    activities_overdue?: number;
}

export interface MarketingDashboardHeatmapEntry {
    date: string;
    total: number;
    completed: number;
    pending: number;
}

export interface MarketingDashboardLeadSource {
    name: string;
    converted?: number;
    total?: number;
}

export interface MarketingDashboardTopInitiative {
    id: number;
    name: string;
    total_prospects: number;
    converted: number;
    conversion_rate: number;
}

export interface MarketingDashboardTeamMember {
    id: number;
    name: string;
    completed_30d: number;
    overdue: number;
}

export interface MarketingDashboardConversion {
    id: number;
    name: string;
    company?: string;
    initiative?: string;
    converted_at: string;
}

export interface MarketingDashboardWorkflow {
    id: number;
    name: string;
    converted_prospects: number;
    total_workflow_prospects: number;
    prospect_conversion_rate: number;
    completed_activities: number;
    total_activities: number;
    completion_rate: number;
}

export interface MarketingDashboardStats {
    heatmap?: MarketingDashboardHeatmapEntry[];
    aging?: { fresh?: number; warm?: number; cooling?: number; stale?: number };
    lead_sources?: MarketingDashboardLeadSource[];
    top_initiatives?: MarketingDashboardTopInitiative[];
    team_performance?: MarketingDashboardTeamMember[];
    recent_conversions?: MarketingDashboardConversion[];
    workflow_effectiveness?: MarketingDashboardWorkflow[];
}

export interface InitiativeTimelineEntry {
    timestamp: number;
    new?: number;
    engaged?: number;
    unresponsive?: number;
    converted?: number;
}

export type ActivityStatsMap = Record<string, ActivityStats> | (ActivityStats & { id: string | number })[];

export interface InitiativeStatsResponse {
    timeline: InitiativeTimelineEntry[];
    activities?: ActivityStatsMap;
    activity_stats?: ActivityStatsMap;
    initiative_activities?: ActivityStatsMap;
    per_activity?: ActivityStatsMap;
}

export interface CustomerStatsResponse {
    companies?: Company[];
    total_last_year?: number;
}

export interface CustomerLocation {
    id: string;
    name: string;
    lat: number;
    lng: number;
    path: string;
    pinSize: 'small' | 'medium' | 'large';
    pinColor: 'grey' | 'red' | 'orange' | 'yellow' | 'green';
}

export interface RoleWithPermissions {
    id: number;
    name: string;
    permissions: Record<string, boolean>;
}

export interface RawBankTx {
    date: string;
    amount: number;
    sender: string;
    reference: string;
}

export interface RawMatchedBankItem {
    expense: Expense;
    is_amount_mismatch: boolean;
    latest_amount: number | string;
    transactions: RawBankTx[];
}

export interface BankTransactionsResponse {
    matched?: RawMatchedBankItem[];
    unmatched?: RawBankTx[];
}

export interface TableColumn {
    Field: string;
    Type: string;
    Null?: string;
    Key?: string;
    Default?: string | null;
    Extra?: string;
}

export interface TableSchema {
    name: string;
    columns: TableColumn[];
}

export interface RelationInfo {
    type: string;
    model?: string;
}

export interface TableRelation {
    table: string;
    relations: Dictionary<RelationInfo>;
}

export interface DashboardWidgetConfig {
    widget: string;
    options: Dictionary<unknown>;
}

export interface Dashboard {
    title: string;
    cols: DashboardWidgetConfig[][];
}

export interface SentinelLabelConfig {
    name: string;
    primaryLabel: string;
    secondaryLabel: string;
}

export interface SentinelActiveItem extends Dictionary, INxContextMenu {
    id: string;
    icon?: string;
}

export interface SentinelActiveGroup {
    id: string;
    sentinel: SentinelLabelConfig;
    items: SentinelActiveItem[];
}

export interface ActivityStats {
    total: number;
    pending: number;
    overdue: number;
    completed: number;
    skipped: number;
    pending_percentage: number;
    overdue_percentage: number;
    completed_percentage: number;
    skipped_percentage: number;
}

export interface BillingConsideration {
    type: 'warning' | 'error';
    label: string;
    tooltip: string;
    project_id?: string;
    uninvoiced_hours?: number;
    invoice_item_id?: string;
}

export interface PredictionEntry { id: number; user: User; total: number; }
export interface PredictionStats { total: number; predictions?: PredictionEntry[]; }

export interface ProjectTimelineEntry {
    user?: { id?: string; name?: string; color?: string; hours_invested?: number };
    data: TimeValuePoint[];
}

export interface DailyWorkloadElement {
    type: 'assignment' | 'milestone';
    id: string;
    name: string;
    hours: number;
    project_id?: string;
    project_path?: string;
    project?: Project;
    project_name?: string;
    workload_percent?: number;
}

export interface DailyWorkload {
    date: string;
    day_of_week: number;
    total_percent: number;
    available_hours: number;
    assignment_hours: number;
    milestone_hours: number;
    total_hours: number;
    is_break: boolean;
    break_type?: string;
    break_name?: string;
    elements: DailyWorkloadElement[];
    distinct_project_count: number;
}

export interface WorkloadData {
    user_id: string;
    start_date: string;
    end_date: string;
    hpw: number;
    hpw_array: number[];
    daily_workload: DailyWorkload[];
    unconfigured_milestones: Milestone[];
}

export interface UserEnvironment {
    user: Dictionary;
    team: Dictionary<TeamMemberData>;
    settings: Dictionary<any>;
    enums: Dictionary;
    tables: TableSchema[];
    relations: TableRelation[];
    accessors?: Dictionary<Dictionary<string>>;
    dashboards: Dashboard[];
    plugins: Dictionary;
    project_states: ProjectState[];
    lead_sources: LeadSource[];
    roles?: unknown[];
    eu_countries: string[];
    encryptions: Encryption[];
}

export interface UptimeCheckDay {
    day: string;
    up_count: number;
    down_count: number;
    degraded_count: number;
    total: number;
}

export interface LiquidityEvent {
    date: string;
    amount: number;
    type: 'expense' | 'standing_order' | 'open_invoice' | 'budget_project' | 'support' | 'downpayment';
    label: string;
    balance_after: number;
    invoice_date?: string;
    payment_days?: number;
}

export interface LiquidityResponse {
    balance: number;
    events?: LiquidityEvent[];
}

export interface AiModel {
    id: string;
    name: string;
    owned_by: string;
}

export interface AiCompletionResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: {
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }[];
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

export interface CsvColumnMapping {
    header: string;
    field: string;
}

export interface CsvImportResult {
    mappings: CsvColumnMapping[];
    rows: string[][];
    initiativeId: string;
    leadSourceId: number;
}

export interface PlzEntry {
    osm_id: number;
    ort: string;
    plz: number | string;
    bundesland: string;
}

export interface CountryEntry {
    name: string;
    alpha2: string;
    'country-code': string;
}

export interface TravelAllowanceRates {
    country: string;
    kleinePauschale: number; // Small allowance (arrival/departure day)
    grossePauschale: number; // Large allowance (full 24-hour day)
    uebernachtung: number; // Accommodation allowance
}

// CompanyContactService.store deserializes into CompanyContact, but the backend
// also includes the raw (un-deserialized) `company` JSON alongside it.
export type CompanyContactStoreResponse = Omit<CompanyContact, 'company'> & { company: Dictionary };
