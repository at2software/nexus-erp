import { Component, ElementRef, inject, Input, ViewChild, OnInit, OnChanges } from '@angular/core';
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

@Component({
    selector: 'project-billing',
    templateUrl: './project-billing.component.html',
    styleUrls: ['./project-billing.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateUnixAdapter }],
    standalone: true,
    imports: [EmptyStateComponent, CommonModule, FormsModule, NgxDaterangepickerMd, CdkTableModule, SearchInputComponent, NgbDatepickerModule, NComponent, RouterModule, MoneyPipe, NexusModule, SafePipe]
})
export class ProjectBillingComponent implements OnInit, OnChanges {

    @ViewChild('desc') descField:ElementRef

    @Input() parent:Project|Company

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

    ngOnInit() {
        this.#global.onObjectSelected.subscribe((_) => this.onSelection(_))
    }
    ngOnChanges(changes:any): void {
        if ('parent' in changes) {
            if (this.parent instanceof Project && this.parent.product_id) {
                this.#productService.show(this.parent.product_id!).subscribe(data => this.selectionProduct = data)
            }
            if (this.parent instanceof Company && this.parent.default_product_id) {
                this.#productService.show(this.parent.default_product_id!).subscribe(data => this.selectionProduct = data)
            }
            this.invoicedUntil = undefined
            this.reloadFoci()
            this.reloadItems()
        }
    }

    reloadFoci()  {        
        this.allFoci = []
        this.foci = []
        this.#focusService.uninvoicedFoci(this.parent).subscribe(_ => {
            this.allFoci = _
            this.filterFoci()
        })
    }
    reloadItems() {
        this.items = []
        this.#invoiceItemService.getSupportItems(this.parent).subscribe(_ => this.items = _.filter((x:any)=>x.type == 0))
    }

    filterFoci = () => {
        if (this.span && this.span.startDate && this.span.endDate) {
            const sb = (_:Focus) => this.span.startDate!.diff(_.time_started(), 'seconds') < 0
            const se = (_:Focus) => this.span.endDate!.diff(_.time_started(), 'seconds') >= 0
            this.foci = this.allFoci.filter(_ => sb(_) && se(_))
        } else {
            this.foci = this.allFoci
        }
    }
    userIconFor = (user_id:string) => User.iconPathFor(user_id)
    onSelection(_:any) {
        const selected = Array.isArray(_) ? _ : [_]
        this.selection = selected.length && (selected[0] instanceof Focus) ? selected : []
        this.selectionSum = this.selection.reduce((b:number, a:Focus) => a.duration + b, 0)
        this.selection.forEach((s:Focus) => { if ((s.comment ?? '').length) this.selectionDescription = s.comment!})
        this.descField?.nativeElement.focus()
    }
    onProductSelect = (_:Product) => {
        this.selectionProduct = _
        if (this.parent instanceof Project) {
            this.parent.product_id = _.id
            this.parent.update({product_id: _.id}).subscribe()
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
            this.#focusService.createInvoiceItemsFor(this.parent, selectedIds, desc, parseFloat(this.selectionSum), this.selectionProduct.id).subscribe((newItem) => {
                this.items.push(InvoiceItem.fromJson(newItem))
            })

        }
    }
    onPrepareInvoice() {
        this.#invoiceItemService.prepareInvoice(this.parent as Project).subscribe(() => {
            this.#router.navigate(['/customers/' + (this.parent as Project).company_id + '/billing'])
        })
    }
    isProject = () => this.parent instanceof Project
    company = ():Company => this.isProject() ? (this.parent as Project).company : this.parent as Company

}
