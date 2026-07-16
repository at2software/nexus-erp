import { Dictionary } from '@constants/constants';
import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { InvoiceItemService } from '@models/invoice/invoice-item.service';
import { ProjectService } from '@models/project/project.service';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { Product } from '@models/product/product.model';
import { ProductService } from '@models/product/product.service';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { GlobalService } from '@models/global.service';
import { User } from '@models/user/user.model';
import { Color } from '@constants/Color';
import { moveInvoiceItems } from '@app/invoices/_shards/invoice-prepare/invoice-item.reorder.const';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { PluginInstanceFactory } from '@models/http/plugin.instance.factory';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { ModalImportExtIssuesComponent, ExtIssueImportTracker } from '@app/_modals/modal-import-ext-issues/modal-import-ext-issues.component';
import { PluginInstance } from '@models/http/plugin.instance';
import { ITaskPlugin } from '@models/tasks/task.plugin.interface';
import { Task } from '@models/tasks/task.model';
import { DecimalPipe, PercentPipe } from '@angular/common';
import { CdkTableModule } from '@angular/cdk/table';
import { AutosaveDirective } from '@directives/autosave.directive';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { ProjectInfoComponent } from '@app/projects/_shards/project-info/project-info.component';
import { ChartProgressComponent } from '@charts/chart-progress/chart-progress.component';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CdkDrag, CdkDropList } from '@angular/cdk/drag-drop';
import { PermissionsDirective } from '@directives/permissions.directive';
import { SafePipe } from '@pipes/safe.pipe';
import { MediaPreviewComponent } from '../project-media/media-preview/media-preview.component';
import type { PredictionEntry } from '@models/api-response';

type DisplayFieldType = 'qty' | 'my_prediction';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'project-planning',
    templateUrl: './project-planning.component.html',
    styleUrls: ['./project-planning.component.scss'],
    imports: [DecimalPipe, PercentPipe, CdkTableModule, AutosaveDirective, ToolbarComponent, MediaPreviewComponent, EmptyStateComponent, SpinnerComponent, ProjectInfoComponent, ChartProgressComponent, Nx, NComponent, NgbTooltipModule, CdkTableModule, CdkDropList, CdkDrag, PermissionsDirective, NgbDropdownModule, SafePipe],
})
export class ProjectPlanningComponent {
    #invoiceItemService = inject(InvoiceItemService);
    #projectService = inject(ProjectService);
    #global = inject(GlobalService);
    #input = inject(InputModalService);
    #productService = inject(ProductService);
    parent = inject(ProjectDetailGuard);
    factory = inject(PluginInstanceFactory);
    #modal = inject(ModalBaseService);

    displayField!: DisplayFieldType;
    project = this.parent.object();
    predictions = signal<PredictionEntry[]>([]);
    predictionTotal = signal(0);
    product = signal<Product | undefined>(undefined);
    showPredictions = signal(false);
    items = signal<InvoiceItem[]>([]);
    loading = signal(true);

    isRunning = computed(() => this.displayField == 'qty');
    sumForMy = computed(() => this.items().reduce((a, b) => a + (b.my_prediction ?? 0), 0));
    sumForQty = computed(() => this.items().reduce((a, b) => a + b.qty, 0));

    loadItems = () =>
        this.#invoiceItemService
            .indexEstimationItems(this.project)
            .subscribe((response) => { this.items.set(response); this.loading.set(false); });

    onItemResolved = () => this.items.update(arr => [...arr]);

    constructor() {
        effect(() => {
            this.loadItems();
            if (this.project.product_id) {
                this.#productService.show(this.project.product_id!).subscribe((p: Product) => {
                    this.product.set(p);
                });
            }
            this.updatePredictions();
        });
    }

    predictionForUser = (p: InvoiceItem, u: User): number | undefined => p.predictions.find((_) => _.user_id == u.id)?.qty ?? undefined;
    sumFor = (u: User) => this.items().reduce((a, b) => a + (b.predictions.find((_) => _.user_id == u.id)?.qty ?? 0), 0);

    updatePredictions = () => {
        this.#projectService.predictionStats(this.project).subscribe((response) => {
            this.predictionTotal.set(response.total);
            const predictions: PredictionEntry[] = 'predictions' in response ? (response.predictions ?? []) : [];
            predictions.sort((_) => _.id);
            predictions.forEach((_) => (_.user = User.fromJson(_['user'])));
            this.predictions.set(predictions);
        });
    };

    mean = (p: InvoiceItem) => (p.predictions.length ? p.predictions.reduce((a, b) => a + b.qty, 0) / p.predictions.length : 0);
    variance = (p: InvoiceItem) => {
        if (p.predictions.length == 0) return 0;
        const mean = this.mean(p);
        const sqr = p.predictions.map((_) => Math.pow(_.qty - mean, 2));
        return Math.sqrt(sqr.reduce((a, b) => a + b) / p.predictions.length);
    };
    variance_wt = (p: InvoiceItem) => (p.predictions.length ? this.variance(p) / this.mean(p) : 0);
    variance_color = (p: InvoiceItem) => Color.fromHsl(120 - 40 * Math.log10(this.variance(p)), 100, 60).toHexString();
    variance_wt_color = (p: InvoiceItem) => Color.fromHsl(120 - 240 * this.variance_wt(p), 100, 60).toHexString();

    readonly taskTrackers = computed(
        () =>
            (this.project.plugin_links ?? [])
                .map((link) => ({ link, instance: this.factory.instanceFor(link) as (PluginInstance & ITaskPlugin) | undefined }))
                .filter((_): _ is ExtIssueImportTracker => !!_.instance && 'ITaskPluginProperty' in _.instance),
    );

    deletePredictions = (item: InvoiceItem) => item.deletePrediction().subscribe(() => {
        this.items.update(arr => [...arr]);
        this.updatePredictions();
    });

    onNewHeader = () => {
        const title = $localize`:@@i18n.project.newHeaderTitle:New section header`;
        const infoMessage = $localize`:@@i18n.project.newHeaderInfo:Headers group the items below them. Enter a title for the new section.`;
        this.#input.open(title, true, infoMessage).confirmed(({ text, more }) => {
            this.#newItem({ text: text, type: 20 });
            if (more) this.onNewHeader();
        });
    };
    onNewItem = () => {
        const title = $localize`:@@i18n.project.newItemTitle:New item`;
        const infoMessage = $localize`:@@i18n.project.newItemDefaultProductInfo:All items created here are assigned to the default product (see project settings).`;
        this.#input.open(title, true, infoMessage).confirmed(({ text, more }) => {
            this.#newItem({ text: text, type: 0, product_source_id: this.product()!.id });
            if (more) this.onNewItem();
        });
    };
    onImportFromTracker(tracker: ExtIssueImportTracker) {
        const existingIssueIds = new Set(
            this.items()
                .filter((_) => _.ext_issue_id && String(_.ext_issue_plugin_link_id) === String(tracker.link.id))
                .map((_) => String(_.ext_issue_id)),
        );
        this.#modal.open(ModalImportExtIssuesComponent, tracker, existingIssueIds).then((tasks) => {
            if (tasks?.length) this.#importTasks(tracker, tasks);
        });
    }
    onDrop = (e: import('@angular/cdk/drag-drop').CdkDragDrop<InvoiceItem[]>) => {
        const current = this.items();
        const order = moveInvoiceItems(current, e.previousIndex, e.currentIndex);
        this.items.set([...current]);
        this.#invoiceItemService.reorder(order).subscribe();
    };
    onUseAllPredictionsForUser(user: User) {
        this.items().forEach((item) => this.onPredictionAccept(item, user));
    }
    onPredictionAccept(item: InvoiceItem, user: User) {
        const pred = this.predictionForUser(item, user)!;
        this.onAcceptPrediction(item, pred);
    }
    onAcceptPrediction(item: InvoiceItem, value: number) {
        item.update({ qty: value }).subscribe(() => {
            item.qty = value!;
            this.items.update(arr => [...arr]);
        });
    }

    #importTasks = (tracker: ExtIssueImportTracker, tasks: Task[]) => {
        const current = this.items();
        let pos = current.length ? Math.max(...current.map((_) => _.position)) + 1 : 0;
        tasks.forEach((task) => {
            this.#newItem({ text: task.name, type: 0, product_source_id: this.product()!.id, ext_issue_plugin_link_id: String(tracker.link.id), ext_issue_id: task.id, position: pos++ });
        });
    };

    #newItem = (additional: Dictionary) => {
        const hUnit = this.#global.setting('INVOICE_HOUR_UNIT');
        const dUnit = this.#global.setting('INVOICE_DAY_UNIT');
        const wage: number = parseFloat(this.#global.setting('INVOICE_HOURLY_WAGE') ?? '0');
        const hpd: number = parseFloat(this.#global.setting('INVOICE_HPD') ?? '0');
        const product = this.product();
        if (product) {
            const item = product?.getInvoiceItem() ?? {};
            if (item) {
                const current = this.items();
                const pos = current.length ? Math.max(...current.map((_) => _.position)) + 1 : 0;
                const multiplier = product.price_multiplier || 1;
                let modifiers: Dictionary<any> = { project_id: this.project.id, qty: 0, position: pos };
                if (product.time_based == 1) modifiers = Object.assign(modifiers, { unit_name: hUnit, price: wage * multiplier });
                if (product.time_based == hpd) modifiers = Object.assign(modifiers, { unit_name: dUnit, price: wage * hpd * multiplier });
                modifiers = Object.assign(modifiers, additional);
                modifiers['product_id'] = null;
                modifiers['invoice_item_predictions'] = null;

                // Apply customer specific discount
                const company = this.project.company;
                if (company?.getParam('INVOICE_DISCOUNT')) {
                    modifiers['discount'] = parseFloat(company.getParam('INVOICE_DISCOUNT') ?? '0');
                }
                // Hourly/daily products always follow the customer's applicable VAT rate; manual-price products only get zeroed when the customer is VAT-exempt.
                if (product.time_based > 0) {
                    if (company) modifiers['vat_rate'] = company.vatRate();
                } else if (company?.isVatExcempt()) {
                    modifiers['vat_rate'] = 0;
                }

                const item = InvoiceItem.fromJson(modifiers);
                item.store(item.toPayload(['my_prediction'])).subscribe((_) => {
                    this.items.update(arr => [...arr, item]);
                });
            }
        }
    };
}
