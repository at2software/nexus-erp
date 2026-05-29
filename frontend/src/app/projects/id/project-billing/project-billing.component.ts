import { ChangeDetectionStrategy, Component, ElementRef, inject, input, effect, computed, signal, viewChild } from '@angular/core';
import { GlobalService } from '@models/global.service';
import { Project } from '@models/project/project.model';
import { Focus } from '@models/focus/focus.model';
import { FocusService } from '@models/focus/focus.service';
import { User } from '@models/user/user.model';
import { Product } from '@models/product/product.model';
import { InvoiceItemService } from '@models/invoice/invoice-item.service';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { Company } from '@models/company/company.model';
import moment from 'moment';
import { ProductService } from '@models/product/product.service';
import { DATESPAN_RANGE } from '@constants/dateSpanRange';
import { StartEnd } from '@constants/constants';
import { NgbDateAdapter, NgbDatepickerModule } from '@ng-bootstrap/ng-bootstrap';
import { NgbDateUnixAdapter } from '@constants/ngb-date-to-unix-adapter';
import { Router, RouterModule } from '@angular/router';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { CdkTableModule } from '@angular/cdk/table';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { NComponent } from '@shards/n/n.component';
import { MoneyPipe } from '@pipes/money.pipe';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { ProjectComponent } from '@shards/project/project.component';
import { SafePipe } from '@pipes/safe.pipe';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'project-billing',
    templateUrl: './project-billing.component.html',
    styleUrls: ['./project-billing.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateUnixAdapter }],
    standalone: true,
    imports: [EmptyStateComponent, DatePipe, DecimalPipe, FormsModule, NgxDaterangepickerMd, CdkTableModule, SearchInputComponent, NgbDatepickerModule, NComponent, RouterModule, MoneyPipe, Nx, NComponent, AvatarComponent, ProjectComponent, SafePipe],
})
export class ProjectBillingComponent {
    #global = inject(GlobalService);
    #productService = inject(ProductService);
    #focusService = inject(FocusService);
    #invoiceItemService = inject(InvoiceItemService);
    #router = inject(Router);

    parent = input.required<Project | Company>();
    protected readonly descField = viewChild<ElementRef>('desc');

    readonly ranges: any = DATESPAN_RANGE;
    readonly fociColumns = ['user_id', 'started_at', 'duration', 'comment'];

    span = signal<StartEnd | undefined>(undefined);
    selectionSum = signal(0);
    selectionDescription = signal('');
    selectionProduct = signal<Product | undefined>(undefined);
    selection = signal<any[]>([]);
    items = signal<InvoiceItem[]>([]);
    allFoci = signal<Focus[]>([]);

    isProject = computed(() => this.parent() instanceof Project);
    company = computed((): Company => (this.isProject() ? (this.parent() as Project).company : (this.parent() as Company)));
    foci = computed(() => {
        const s = this.span();
        return s?.startDate && s?.endDate
            ? Focus.filterByDateRange(this.allFoci(), s.startDate, s.endDate)
            : this.allFoci();
    });

    constructor() {
        this.#global.onObjectSelected.pipe(takeUntilDestroyed()).subscribe((_) => this.#onSelection(_));
        effect(() => {
            const parent = this.parent();
            if (parent instanceof Project && parent.product_id) {
                this.#productService.show(parent.product_id).subscribe((data) => this.selectionProduct.set(data));
            } else if (parent instanceof Company && parent.default_product_id) {
                this.#productService.show(parent.default_product_id).subscribe((data) => this.selectionProduct.set(data));
            }
            this.#reloadFoci();
            this.#reloadItems();
        });
    }

    #reloadFoci() {
        this.allFoci.set([]);
        this.#focusService.uninvoicedFoci(this.parent()).subscribe((data) => this.allFoci.set(data));
    }

    #reloadItems() {
        this.items.set([]);
        this.#invoiceItemService.getSupportItems(this.parent()).subscribe((data) => this.items.set(data.filter((x: any) => x.type == 0)));
    }

    #onSelection(_: any) {
        const selected = [_].flat();
        const sel = selected.length && selected[0] instanceof Focus ? selected : [];
        this.selection.set(sel);
        this.selectionSum.set(sel.reduce((b: number, a: Focus) => a.duration + b, 0));
        sel.forEach((s: Focus) => {
            if ((s.comment ?? '').length) this.selectionDescription.set(s.comment!);
        });
        this.descField()?.nativeElement.focus();
    }

    readonly userIconFor = (user_id: string) => User.iconPathFor(user_id);

    onProductSelect(_: Product) {
        this.selectionProduct.set(_);
        const parent = this.parent();
        if (parent instanceof Project) {
            parent.product_id = _.id;
            parent.update({ product_id: _.id }).subscribe();
        }
        this.descField()?.nativeElement.focus();
    }

    dateSelect() {
        this.#reloadFoci();
    }

    onCreateNewItem() {
        let min: moment.Moment | undefined;
        let max: moment.Moment | undefined;
        const selectedIds = this.selection().map((_) => {
            const created = _.momentCreated();
            min = min ? moment.min(created, min) : created;
            max = max ? moment.max(created, max) : created;
            return _.id;
        });
        this.selection.set([]);
        this.allFoci.update((f) => f.filter((_: Focus) => !selectedIds.includes(_.id)));
        const product = this.selectionProduct();
        if (product) {
            const desc = this.selectionDescription() + '<br>' + $localize`:@@i18n.invoices.performancePeriod:performance period` + ' ' + min!.format('DD.MM.YYYY') + ' - ' + max!.format('DD.MM.YYYY');
            this.#focusService.createInvoiceItemsFor(this.parent(), selectedIds, desc, this.selectionSum(), product.id).subscribe((newItem) => {
                this.items.update((items) => [...items, InvoiceItem.fromJson(newItem)]);
            });
        }
    }

    onPrepareInvoice() {
        const parent = this.parent();
        this.#invoiceItemService.prepareInvoice(parent as Project).subscribe(() => {
            this.#router.navigate(['/customers/' + (parent as Project).company_id + '/billing']);
        });
    }
}
