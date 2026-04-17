import { Component, ElementRef, inject, ViewChild, input, effect, computed } from '@angular/core';
import { GlobalService } from '@models/global.service';
import { ToastService } from '@shards/toast/toast.service';
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
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { CdkTableModule } from '@angular/cdk/table';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { NComponent } from '@shards/n/n.component';
import { MoneyPipe } from '../../../../pipes/money.pipe';
import { NexusModule } from '@app/nx/nexus.module';
import { SafePipe } from '../../../../pipes/safe.pipe';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'project-billing',
    templateUrl: './project-billing.component.html',
    styleUrls: ['./project-billing.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateUnixAdapter }],
    standalone: true,
    imports: [EmptyStateComponent, CommonModule, FormsModule, NgxDaterangepickerMd, CdkTableModule, SearchInputComponent, NgbDatepickerModule, NComponent, RouterModule, MoneyPipe, NexusModule, SafePipe]
})
export class ProjectBillingComponent {

    @ViewChild('desc') descField:ElementRef

    parent = input.required<Project|Company>()

    ranges        : any = DATESPAN_RANGE
    span          : StartEnd
    invoicedUntil?: string = undefined
    foci          : Focus[] = []
    allFoci       : Focus[] = []
    fociColumns = ['user_id', 'started_at', 'duration', 'comment']

    selectionSum         : string = "0"
    selectionDescription : string = ''
    selectionProduct    ?: Product
    selection            : any[] = []

    items:InvoiceItem[] = []

    toast               = inject(ToastService)
    #global             = inject(GlobalService)
    #productService     = inject(ProductService)
    #focusService       = inject(FocusService)
    #invoiceItemService = inject(InvoiceItemService)
    #router             = inject(Router)
    
    isProject = computed(() => this.parent() instanceof Project)
    company = computed(():Company => this.isProject() ? (this.parent() as Project).company : this.parent() as Company)

    constructor() { 
        this.#global.onObjectSelected.pipe(takeUntilDestroyed()).subscribe((_) => this.onSelection(_))
        effect(() => {
            const parent = this.parent()
            if (parent instanceof Project && parent.product_id) {
                this.#productService.show(parent.product_id!).subscribe(data => this.selectionProduct = data)
            }
            if (parent instanceof Company && parent.default_product_id) {
                this.#productService.show(parent.default_product_id!).subscribe(data => this.selectionProduct = data)
            }
            this.invoicedUntil = undefined
            this.reloadFoci()
            this.reloadItems()
        })
    }

    reloadFoci()  {        
        this.allFoci = []
        this.foci = []
        this.#focusService.uninvoicedFoci(this.parent()).subscribe(_ => {
            this.allFoci = _
            this.filterFoci()
        })
    }
    reloadItems() {
        this.items = []
        this.#invoiceItemService.getSupportItems(this.parent()).subscribe(_ => this.items = _.filter((x:any)=>x.type == 0))
    }

    filterFoci = () => {
        if (this.span?.startDate && this.span?.endDate) {
            this.foci = Focus.filterByDateRange(this.allFoci, this.span.startDate, this.span.endDate)
        } else {
            this.foci = this.allFoci
        }
    }
    userIconFor = (user_id:string) => User.iconPathFor(user_id)
    onSelection(_:any) {
        const selected = [_].flat()
        this.selection = selected.length && (selected[0] instanceof Focus) ? selected : []
        this.selectionSum = this.selection.reduce((b:number, a:Focus) => a.duration + b, 0)
        this.selection.forEach((s:Focus) => { if ((s.comment ?? '').length) this.selectionDescription = s.comment!})
        this.descField?.nativeElement.focus()
    }
    onProductSelect = (_:Product) => {
        this.selectionProduct = _
        const parent = this.parent()
        if (parent instanceof Project) {
            parent.product_id = _.id
            parent.update({product_id: _.id}).subscribe()
        }
        this.descField?.nativeElement.focus()
    }
    // selection range
    datesUpdated() {
        this.filterFoci()
    }
    // marker
    dateSelect() {       
        this.reloadFoci()
    }
    onCreateNewItem() {
        let min:moment.Moment|undefined = undefined
        let max:moment.Moment|undefined = undefined
        const selectedIds = this.selection.map(_ => {
            min = min ? moment.min(_.time_created(), min) : moment(_.time_created())
            max = max ? moment.max(_.time_created(), max) : moment(_.time_created())
            return _.id
        })
        this.selection = []
        this.foci = this.foci.filter((_:Focus) => !selectedIds.includes(_.id))
        if (this.selectionProduct) {
            let desc = this.selectionDescription
            desc += '<br>' + $localize`:@@i18n.invoices.performancePeriod:performance period` + ' ' + min!.format('DD.MM.YYYY') + ' - ' + max!.format('DD.MM.YYYY')
            this.#focusService.createInvoiceItemsFor(this.parent(), selectedIds, desc, parseFloat(this.selectionSum), this.selectionProduct.id).subscribe((newItem) => {
                this.items.push(InvoiceItem.fromJson(newItem))
            })

        }
    }
    onPrepareInvoice() {
        const parent = this.parent()
        this.#invoiceItemService.prepareInvoice(parent as Project).subscribe(() => {
            this.#router.navigate(['/customers/' + (parent as Project).company_id + '/billing'])
        })
    }

}
