import { ChangeDetectionStrategy, Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { tracked } from '@constants/tracked';
import { Router, RouterModule } from '@angular/router';
import { Assignee } from '@models/assignee/assignee.model';
import { Invoice } from '@models/invoice/invoice.model';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { CompanyContact } from '@models/company/company-contact.model';
import { GlobalService } from '@models/global.service';
import { EchartsRangeCardComponent } from '@charts/echarts-card/echarts-range-card.component';
import { VcardClass } from '@models/vcard/VcardClass';
import { AssignmentService } from '@models/assignee/assignment.service';
import { Product } from '@models/product/product.model';
import { ProductService } from '@models/product/product.service';
import { CustomerDetailGuard } from '@app/customers/customers.details.guard';
import { Serializable } from '@models/serializable';
import { ProjectService } from '@models/project/project.service';
import { InvoiceService } from '@models/invoice/invoice.service';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { ListGroupItemContactComponent } from '@app/customers/_shards/list-group-item-contact/list-group-item-contact.component';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { NgbTooltipModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { CustomerQuickstatsComponent } from '@app/customers/_shards/customer-quickstats/customer-quickstats.component';
import { ProjectsTableComponent } from '@app/projects/_shards/projects-table/projects-table.component';
import { InvoicesTable } from '@app/invoices/_shards/invoices-table/invoices-table';
import { CustomerInitiativesComponent } from '@app/customers/_shards/customer-initiatives/customer-initiatives.component';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { ProjectTeamPlanningComponent } from '@app/projects/_shards/project-team-planning/project-team-planning.component';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { SafePipe } from '@pipes/safe.pipe';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { MoneyPipe } from '@pipes/money.pipe';
import { MediaPreviewComponent } from '@app/projects/id/project-media/media-preview/media-preview.component';
import { CompanyLocaleSelectorComponent } from '@app/customers/_shards/company-locale-selector/company-locale-selector.component';
import { CustomerPredictionBiasChartComponent } from '@app/customers/_shards/customer-prediction-bias-chart/customer-prediction-bias-chart.component';
import { WorkloadTimelineChartComponent } from '@shards/workload-timeline-chart/workload-timeline-chart.component';
import { Page } from '@models/http/http.nexus';
import { Dictionary } from '@constants/constants';
import { MlReliabilityDirective } from '@directives/ml-reliability.directive';

const REMARKETING_INTERVALS: Record<number, string> = {
    0: $localize`:@@i18n.common.none:none`,
    1: $localize`:@@i18n.common.daily:daily`,
    4: $localize`:@@i18n.common.weekly:weekly`,
    5: $localize`:@@i18n.marketing.everyTwoWeeks:every two weeks`,
    2: $localize`:@@i18n.common.monthly:monthly`,
    6: $localize`:@@i18n.marketing.everyTwoMonths:every two months`,
    7: $localize`:@@i18n.marketing.everyThreeMonths:every three months`,
    8: $localize`:@@i18n.marketing.everySixMonths:every six months`,
    3: $localize`:@@i18n.common.yearly:yearly`,
};

@Component({
    selector: 'customer-dashboard',
    templateUrl: './customer-dashboard.html',
    imports: [ToolbarComponent, ScrollbarComponent, ListGroupItemContactComponent, SearchInputComponent, NgbTooltipModule, NgbDropdownModule, FormsModule, RouterModule, CustomerQuickstatsComponent, MediaPreviewComponent, ProjectsTableComponent, InvoicesTable, EchartsRangeCardComponent, Nx, NComponent, ProjectTeamPlanningComponent, HotkeyDirective, SafePipe, PercentPipe, DecimalPipe, MoneyPipe, CompanyLocaleSelectorComponent, CustomerInitiativesComponent, CustomerPredictionBiasChartComponent, WorkloadTimelineChartComponent, MlReliabilityDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerDashboard {
    #parent = inject(CustomerDetailGuard);
    #router = inject(Router);
    #global = inject(GlobalService);
    #inputModalService = inject(InputModalService);
    #projectService = inject(ProjectService);
    #invoiceService = inject(InvoiceService);
    #assignmentService = inject(AssignmentService);
    #productService = inject(ProductService);

    company = tracked(this.#parent.object);

    invoices = signal<Invoice[]>([]);
    assignees = signal<Assignee[]>([]);
    quickContacts = signal<CompanyContact[]>([]);
    canBeAssigned = signal<Assignee[]>([]);
    product = signal<Product | undefined>(undefined);
    showDefaultProduct = signal(false);
    showLeadSource = signal(false);

    readonly globalUserHasInvoicingRole = this.#global.user?.hasRole('invoicing') ?? false;
    readonly intervalKeys = Object.keys(REMARKETING_INTERVALS);

    forecastRevenue = computed(() => +(this.company().getParam('STATS_LINREG_FORECAST_12M') ?? 0));
    currentRevenue = computed(() => +(this.company().getParam('INVOICE_REVENUE_12M') ?? 0));
    forecastUp = computed(() => this.forecastRevenue() >= this.currentRevenue());
    forecastChange = computed(() => this.currentRevenue() > 0 ? (this.forecastRevenue() - this.currentRevenue()) / this.currentRevenue() : 0);

    // ML predictions (Rubix ML) — additive to the linreg forecast above, never a replacement.
    mlRevenue = computed(() => this.company().mlPredictedRevenue12m());
    mlIntervalDays = computed(() => this.company().mlPredictedIntervalDays());
    mlChurnProbability = computed(() => this.company().mlChurnProbability12m());
    mlNextPurchaseAt = computed(() => this.company().mlPredictedNextPurchaseAt());
    mlOverdueForContact = computed(() => this.company().mlOverdueForContact());
    mlSupportHours = computed(() => this.company().mlPredictedSupportHours());
    mlChurnHigh = computed(() => (this.mlChurnProbability() ?? 0) >= 0.5);
    mlNeedsAttention = computed(() => this.mlOverdueForContact() || this.mlChurnHigh());

    constructor() {
        effect(() => {
            const company = this.company();
            untracked(() => {
                if (this.globalUserHasInvoicingRole) {
                    this.#invoiceService
                        .index({ company_id: company.id, onlyUnpaid: 'true' })
                        .subscribe((x: Invoice[] | Page<Invoice>) => this.invoices.set(Array.isArray(x) ? x : x.data));
                }
                if (company.default_product_id) {
                    this.#productService.show(company.default_product_id).subscribe((p: Product) => this.product.set(p));
                }
                this.quickContacts.set(company.employees.filter((u) => u.is_favorite));
                this.assignees.set(company.assignees.filter((_) => _.assignee?.class == 'User'));
                this.canBeAssigned.set(
                    Object.values(this.#global.team)
                        .map((_) => Assignee.newU(_))
                        .filter((x) => this.assignees().filter((a) => a.user_id == x.user_id).length == 0)
                );
            });
        });
    }

    reload = () => this.#parent.reload();
    getIntervalText = (_?: string | number) => REMARKETING_INTERVALS[+(_ ?? 0)];
    getIntervalIcon = (_?: string | number) => ({ 0: '--', 1: '1D', 4: '1W', 5: '2W', 2: '1M', 6: '2M', 7: '3M', 8: '6M', 3: '1Y' } as Record<number, string>)[+(_ ?? 0)] || 'schedule';

    onAddProject = () => {
        this.#inputModalService.open('@@i18n.common.name').confirmed(({ text }) => {
            this.#projectService.addProject(this.company().id, text).subscribe((x) => this.#router.navigate(['/projects/' + x.id]));
        });
    };

    onProductSelect = (selected: Serializable) => {
        const product = selected.assert(Product);
        if (!product) return;
        const company = this.company();
        company.default_product_id = product.id;
        this.product.set(product);
        company.update({ default_product_id: product.id }).subscribe();
    };

    addUser = (x: VcardClass) => this.#assignmentService.addToCompany(this.company(), { id: x.id, class: 'user' }).subscribe(() => this.reload());

    onLeadSourceSelected = (_: Serializable) => {
        const company = this.company();
        company.update({ source_type: 'App\\Models\\' + _.class, source_id: _.id }).subscribe((r) => company.setSource(r as unknown as Dictionary));
    };
}
