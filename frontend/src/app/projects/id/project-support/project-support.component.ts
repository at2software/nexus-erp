import { CdkTableModule } from '@angular/cdk/table';
import { Component, computed, effect, ElementRef, inject, input, OnDestroy, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { NexusModule } from '@app/nx/nexus.module';
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
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { DatePipe, DecimalPipe } from '@angular/common';
import { MoneyPipe } from '../../../../pipes/money.pipe';
import moment from 'moment';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { Subscription } from 'rxjs';

@Component({
    selector: 'project-support',
    standalone: true,
    imports: [CdkTableModule, DatePipe, DecimalPipe, FormsModule, RouterLink, NexusModule, AffixInputDirective, NgbTooltipModule, NgxDaterangepickerMd, EmptyStateComponent, SearchInputComponent, SpinnerComponent, MoneyPipe],
    templateUrl: './project-support.component.html',
    styleUrl: './project-support.component.scss'
})
export class ProjectSupportComponent implements OnDestroy {

    parent = input.required<Project | Company>()

    readonly ranges: any = DATESPAN_RANGE
    span: StartEnd
    foci = signal<Focus[]>([])
    selectionProduct = signal<Product | undefined>(undefined)
    selectionSum = signal<string>('0')
    selectionDescription = signal<string>('')
    selection = signal<Focus[]>([])
    supportItems = signal<InvoiceItem[]>([])

    readonly fociColumns = ['user_id', 'started_at', 'comment', 'duration']
    readonly supportItemColumns = ['text', 'net']

    readonly isProject = computed(() => this.parent() instanceof Project)
    readonly vatId = computed(() => this.parent() instanceof Project
        ? (this.parent() as Project).company?.vat_id
        : (this.parent() as Company).vat_id)
    readonly invoicingRoute = computed(() => this.isProject() ? 'invoicing' : 'billing')

    readonly descField = viewChild<ElementRef>('desc')
    readonly fociSpinner = viewChild<SpinnerComponent>('fociSpinner')

    #focusService = inject(FocusService)
    #invoiceItemService = inject(InvoiceItemService)
    #productService = inject(ProductService)
    #global = inject(GlobalService)

    get global() { return this.#global }

    #allFoci: Focus[] = []
    #selectionSub: Subscription

    constructor() {
        effect(() => {
            const p = this.parent()
            this.#initProduct(p)
            this.reloadFoci()
            this.reloadSupportItems()
        })

        this.#selectionSub = this.#global.onObjectSelected.subscribe(_ => this.#onSelection(_))
    }

    ngOnDestroy() {
        this.#global.registerSelectedObject(null, false)
        this.#selectionSub.unsubscribe()
    }

    #initProduct(project: Project | Company) {
        if (project instanceof Project && project.product) {
            this.selectionProduct.set(project.product)
        } else if (project instanceof Company && (project as Company).default_product_id) {
            this.#productService.show((project as Company).default_product_id).subscribe(_ => this.selectionProduct.set(_))
        }
    }

    reloadFoci() {
        this.fociSpinner()?.show()
        this.#allFoci = []
        this.foci.set([])
        this.#focusService.uninvoicedFoci(this.parent()).subscribe(_ => {
            this.#allFoci = _
            this.#filterFoci()
            this.fociSpinner()?.hide()
        })
    }

    reloadSupportItems() {
        this.#invoiceItemService.getInvoiceItems(this.parent(), { append: 'my_prediction', with: 'predictions' }).subscribe((items: InvoiceItem[]) => {
            this.supportItems.set(items.filter((x: any) => x.stage === 1 && !x.invoice_id))
        })
    }

    #onSelection(_: any) {
        setTimeout(() => {
            const selected = [_].flat()
            const foci = selected.length && (selected[0] instanceof Focus) ? selected : []
            this.selection.set(foci)
            this.selectionSum.set(foci.reduce((b: number, a: Focus) => a.duration + b, 0).toString())
            foci.forEach((s: Focus) => { if ((s.comment ?? '').length) this.selectionDescription.set(s.comment!) })
            this.descField()?.nativeElement.focus()
        })
    }

    datesUpdated() {
        this.#filterFoci()
    }

    #filterFoci() {
        if (this.span?.startDate && this.span?.endDate) {
            const sb = (_: Focus) => this.span.startDate!.diff(_.time_started(), 'seconds') < 0
            const se = (_: Focus) => this.span.endDate!.diff(_.time_started(), 'seconds') >= 0
            this.foci.set(this.#allFoci.filter(_ => sb(_) && se(_)))
        } else {
            this.foci.set(this.#allFoci)
        }
    }

    onCreateNewSupportItem() {
        const sel = this.selection()
        let min: moment.Moment | undefined = undefined
        let max: moment.Moment | undefined = undefined
        const selectedIds = sel.map(_ => {
            const ca = _.time_started()
            min = min ? moment.min(ca, min) : ca
            max = max ? moment.max(ca, max) : ca
            return _.id
        })
        setTimeout(() => {
            this.selection.set([])
            this.foci.update(f => f.filter((_: Focus) => !selectedIds.includes(_.id)))
        })
        const product = this.selectionProduct()
        if (product) {
            let desc = this.selectionDescription()
            desc += '<br>' + $localize`:@@i18n.invoices.performancePeriod:performance period` + ' ' + min!.format('DD.MM.YYYY') + ' - ' + max!.format('DD.MM.YYYY')
            this.#focusService.createInvoiceItemsFor(this.parent(), selectedIds, desc, parseFloat(this.selectionSum()), product.id).subscribe(() => {
                this.reloadSupportItems()
                this.reloadFoci()
            })
        }
    }

    onProductSelect(_: Product) {
        this.selectionProduct.set(_)
        this.descField()?.nativeElement.focus()
    }
}
