import { CdkTableModule } from '@angular/cdk/table';
import { CommonModule } from '@angular/common';
import { Component, ElementRef, inject, Input, OnChanges, ViewChild, OnInit, OnDestroy } from '@angular/core';
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
import { InvoiceItemType } from '../../../../enums/invoice-item.type';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { MoneyPipe } from '../../../../pipes/money.pipe';
import moment from 'moment';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';

@Component({
    selector: 'project-support',
    standalone: true,
    imports: [CdkTableModule, CommonModule, FormsModule, RouterLink, NexusModule, AffixInputDirective, NgbTooltipModule, NgxDaterangepickerMd, EmptyStateComponent, SearchInputComponent, SpinnerComponent, MoneyPipe],
    templateUrl: './project-support.component.html',
    styleUrl: './project-support.component.scss'
})
export class ProjectSupportComponent implements OnInit, OnChanges, OnDestroy {

    @Input() parent: Project | Company

    ranges: any = DATESPAN_RANGE
    span: StartEnd
    foci: Focus[] = []
    allFoci: Focus[] = []
    fociColumns = ['user_id', 'started_at', 'comment', 'duration']
    selectionProduct?: Product
    selectionSum: string = "0"
    selectionDescription: string = ''
    selection: any[] = []
    supportItems: InvoiceItem[] = []
    supportItemColumns = ['text', 'net']

    project: Project | Company
    #focusService = inject(FocusService)
    #invoiceItemService = inject(InvoiceItemService)
    #productService = inject(ProductService)
    #global = inject(GlobalService)

    get global() { return this.#global; }
    get isProject() { return this.project instanceof Project }
    get vatId() { return this.project instanceof Project ? (this.project as Project).company?.vat_id : (this.project as Company).vat_id }
    get invoicingRoute() { return this.isProject ? 'invoicing' : 'billing' }

    @ViewChild('desc') descField: ElementRef
    @ViewChild('fociSpinner') fociSpinner?: SpinnerComponent

    ngOnInit() {
        this.#global.onObjectSelected.subscribe((_) => this.onSelection(_))
    }

    ngOnChanges() {
        if (this.parent) {
            this.project = this.parent
            this.#initProduct()
            this.reloadFoci()
            this.reloadSupportItems()
        }
    }

    #initProduct() {
        if (this.project instanceof Project && this.project.product) {
            this.selectionProduct = this.project.product
        } else if (this.project instanceof Company && (this.project as Company).default_product_id) {
            this.#productService.show((this.project as Company).default_product_id).subscribe(_ => this.selectionProduct = _)
        }
    }

    ngOnDestroy() {
        this.#global.registerSelectedObject(null, false)
    }

    reloadFoci() {
        this.fociSpinner?.show()
        this.allFoci = []
        this.foci = []
        this.#focusService.uninvoicedFoci(this.project).subscribe(_ => {
            this.allFoci = _
            this.filterFoci()
            this.fociSpinner?.hide()
        })
    }

    reloadSupportItems() {
        this.#invoiceItemService.getInvoiceItems(this.project, { append: 'my_prediction', with: 'predictions' }).subscribe((items: InvoiceItem[]) => {
            this.supportItems = items.filter((x: any) => x.type === InvoiceItemType.PreparedSupport)
        })
    }

    onSelection(_: any) {
        setTimeout(() => {
            const selected = Array.isArray(_) ? _ : [_]
            this.selection = selected.length && (selected[0] instanceof Focus) ? selected : []
            this.selectionSum = this.selection.reduce((b: number, a: Focus) => a.duration + b, 0)
            this.selection.forEach((s: Focus) => { if ((s.comment ?? '').length) this.selectionDescription = s.comment! })
            this.descField?.nativeElement.focus()
        })
    }

    datesUpdated() {
        this.filterFoci()
    }

    filterFoci = () => {
        if (this.span && this.span.startDate && this.span.endDate) {
            const sb = (_: Focus) => this.span.startDate!.diff(_.time_started(), 'seconds') < 0
            const se = (_: Focus) => this.span.endDate!.diff(_.time_started(), 'seconds') >= 0
            this.foci = this.allFoci.filter(_ => sb(_) && se(_))
        } else {
            this.foci = this.allFoci
        }
    }

    onCreateNewSupportItem() {
        let min: moment.Moment | undefined = undefined
        let max: moment.Moment | undefined = undefined
        const selectedIds = this.selection.map(_ => {
            const ca = _.time_started()
            min = min ? moment.min(ca, min) : ca
            max = max ? moment.max(ca, max) : ca
            return _.id
        })
        setTimeout(() => {
            this.selection = []
            this.foci = this.foci.filter((_: Focus) => !selectedIds.includes(_.id))
        })
        if (this.selectionProduct) {
            let desc = this.selectionDescription
            desc += '<br>' + $localize`:@@i18n.invoices.performancePeriod:performance period` + ' ' + min!.format('DD.MM.YYYY') + ' - ' + max!.format('DD.MM.YYYY')
            this.#focusService.createInvoiceItemsFor(this.project, selectedIds, desc, parseFloat(this.selectionSum), this.selectionProduct.id).subscribe(() => {
                this.reloadSupportItems()
                this.reloadFoci()
            })
        }
    }

    onProductSelect = (_: Product) => {
        this.selectionProduct = _
        this.descField?.nativeElement.focus()
    }
}
