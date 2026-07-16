import { CdkTableModule } from '@angular/cdk/table';
import { ChangeDetectionStrategy, Component, computed, DestroyRef, effect, ElementRef, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { StartEnd } from '@constants/constants';
import { DATESPAN_RANGE } from '@constants/dateSpanRange';
import { AffixInputDirective } from '@directives/affix-input.directive';
import { Focus } from '@models/focus/focus.model';
import { FocusService } from '@models/focus/focus.service';
import { GlobalService } from '@models/global.service';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { InvoiceItemService } from '@models/invoice/invoice-item.service';
import { Product } from '@models/product/product.model';
import { ProductService } from '@models/product/product.service';
import { Project } from '@models/project/project.model';
import { Company } from '@models/company/company.model';
import { Serializable } from '@models/serializable';
import { ExtIssueResolverService, ExtIssueRef } from '@models/ext-issue/ext-issue-resolver.service';
import { PluginInstanceFactory } from '@models/http/plugin.instance.factory';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MoneyPipe } from '@pipes/money.pipe';
import { Dayjs, dayjsMin, dayjsMax } from '@constants/dates';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { Subscription } from 'rxjs';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'project-support',
    imports: [CdkTableModule, DatePipe, DecimalPipe, FormsModule, RouterLink, Nx, NComponent, AffixInputDirective, NgbTooltipModule, NgxDaterangepickerMd, EmptyStateComponent, SearchInputComponent, SpinnerComponent, MoneyPipe],
    templateUrl: './project-support.component.html',
    styleUrl: './project-support.component.scss',
})
export class ProjectSupportComponent {

    #focusService = inject(FocusService);
    #invoiceItemService = inject(InvoiceItemService);
    #productService = inject(ProductService);
    #extIssueResolver = inject(ExtIssueResolverService);
    #pluginFactory = inject(PluginInstanceFactory);
    #destroyRef = inject(DestroyRef);
    global = inject(GlobalService);

    parent = input.required<Project | Company>();
    parentReloadRequested = output<void>();

    readonly ranges = DATESPAN_RANGE;
    span: StartEnd = new StartEnd();
    foci = signal<Focus[]>([]);
    selectionProduct = signal<Product | undefined>(undefined);
    selectionSum = signal<string>('0');
    selectionDescription = signal<string>('');
    selection = signal<Focus[]>([]);
    supportItems = signal<InvoiceItem[]>([]);

    /** Live-resolved external issue links keyed by focus id. Status is fetched, never stored. */
    extIssues = signal<Record<string, ExtIssueRef>>({});

    readonly supportItemColumns = ['text', 'net'];

    readonly isProject = computed(() => this.parent() instanceof Project);
    readonly hasIssueTracker = computed(() => (this.isProject() ? this.#pluginFactory.getTaskInstances(this.parent()).length > 0 : false));
    readonly fociColumns = computed(() => (this.hasIssueTracker() ? ['user_id', 'started_at', 'comment', 'ext_issue', 'duration'] : ['user_id', 'started_at', 'comment', 'duration']));
    readonly vatId = computed(() => (this.parent() instanceof Project ? (this.parent() as Project).company?.vat_id : (this.parent() as Company).vat_id));
    readonly invoicingRoute = computed(() => (this.isProject() ? ['..', 'invoicing', 'support'] : ['..', 'billing']));

    readonly descField = viewChild<ElementRef>('desc');
    readonly fociSpinner = viewChild<SpinnerComponent>('fociSpinner');

    #allFoci: Focus[] = [];
    #selectionSub: Subscription;

    constructor() {
        effect(() => {
            const p = this.parent();
            this.#initProduct(p);
            this.reloadFoci();
            this.reloadSupportItems();
        });

        this.#selectionSub = this.global.onObjectSelected.subscribe((_) => this.#onSelection(_));
        this.#destroyRef.onDestroy(() => {
            this.global.registerSelectedObject(null, false);
            this.#selectionSub.unsubscribe();
        });
    }

    #initProduct(project: Project | Company) {
        if (project instanceof Project && project.product) {
            this.selectionProduct.set(project.product);
        } else if (project instanceof Company && (project as Company).default_product_id) {
            this.#productService.show((project as Company).default_product_id).subscribe((_) => this.selectionProduct.set(_));
        }
    }

    reloadFoci() {
        this.fociSpinner()?.show();
        this.#allFoci = [];
        this.foci.set([]);
        this.#focusService.uninvoicedFoci(this.parent()).subscribe({
            next: (_) => {
                this.#allFoci = _;
                this.#filterFoci();
                this.#extIssueResolver.resolveRows(this.isProject() ? (this.parent() as Project) : undefined, this.#allFoci, this.extIssues);
                this.fociSpinner()?.hide();
            },
            error: () => this.fociSpinner()?.hide(),
        });
    }

    /** Re-resolves ext-issue links after a row action (e.g. "link external issue") completes. */
    onFociActionsResolved = () => this.#extIssueResolver.resolveRows(this.isProject() ? (this.parent() as Project) : undefined, this.#allFoci, this.extIssues);

    reloadSupportItems() {
        this.#invoiceItemService.getInvoiceItems(this.parent(), { append: 'my_prediction', with: 'predictions' }).subscribe((items: InvoiceItem[]) => {
            this.supportItems.set(items.filter((x) => x.stage === 1 && !x.invoice_id));
        });
    }

    #onSelection(_: unknown) {
        setTimeout(() => {
            const selected = [_].flat();
            const foci = (selected.length && selected[0] instanceof Focus ? selected : []) as Focus[];
            this.selection.set(foci);
            this.selectionSum.set(foci.reduce((b: number, a: Focus) => a.duration + b, 0).toString());
            foci.forEach((s: Focus) => {
                if (s.comment?.length) {
                    this.selectionDescription.set(s.comment);
                }
            });
            if (foci.length) this.descField()?.nativeElement.focus();
        });
    }

    datesUpdated() {
        this.#filterFoci();
    }

    #filterFoci() {
        if (this.span?.startDate && this.span?.endDate) {
            const sb = (_: Focus) => this.span.startDate!.diff(_.momentStarted(), 'seconds') < 0;
            const se = (_: Focus) => this.span.endDate!.diff(_.momentStarted(), 'seconds') >= 0;
            this.foci.set(this.#allFoci.filter((_) => sb(_) && se(_)));
        } else {
            this.foci.set(this.#allFoci);
        }
    }

    onCreateNewSupportItem() {
        const sel = this.selection();
        let min: Dayjs | undefined = undefined;
        let max: Dayjs | undefined = undefined;
        const selectedIds = sel.map((_) => {
            const ca = _.momentStarted();
            min = min ? dayjsMin(ca, min) : ca;
            max = max ? dayjsMax(ca, max) : ca;
            return _.id;
        });
        setTimeout(() => {
            this.selection.set([]);
            this.foci.update((f) => f.filter((_: Focus) => !selectedIds.includes(_.id)));
        });
        const product = this.selectionProduct();
        if (product) {
            let desc = this.selectionDescription();
            desc += '<br>' + $localize`:@@i18n.invoices.performancePeriod:performance period` + ' ' + min!.format('DD.MM.YYYY') + ' - ' + max!.format('DD.MM.YYYY');
            this.#focusService.createInvoiceItemsFor(this.parent(), selectedIds, desc, parseFloat(this.selectionSum()), product.id).subscribe(() => {
                this.reloadSupportItems();
                this.reloadFoci();
                this.parentReloadRequested.emit();
            });
        }
    }

    onProductSelect(selected: Serializable) {
        const product = selected.assert(Product);
        if (!product) return;
        this.selectionProduct.set(product);
        this.descField()?.nativeElement.focus();
    }
}
