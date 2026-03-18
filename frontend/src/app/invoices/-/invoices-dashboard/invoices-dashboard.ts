import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InvoicesTable } from '@app/invoices/_shards/invoices-table/invoices-table';
import { ContinuousMarkerComponent } from '@shards/continuous/continuous.marker.component';
import { NgxDaterangepickerMd } from 'ngx-daterangepicker-material';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { Observable } from 'rxjs';
import { StartEnd } from '@constants/constants';
import { DATESPAN_RANGE } from '@constants/dateSpanRange';
import { Company } from '@models/company/company.model';
import { Invoice } from '@models/invoice/invoice.model';
import { InvoiceService } from '@models/invoice/invoice.service';

@Component({
    selector: 'invoices-dashboard',
    templateUrl: './invoices-dashboard.html',
    styleUrls: ['./invoices-dashboard.scss'],
    standalone: true,
    imports: [FormsModule, InvoicesTable, ContinuousMarkerComponent, NgxDaterangepickerMd, EmptyStateComponent]
})
export class InvoicesDashboard implements OnInit {

    invoices: Invoice[] = []
    hasLoaded: boolean = false
    company: Company = Company.fromJson({})
    onlyUnpaid: boolean = true
    onlyPaid: boolean = false
    loadsum: number = 0

    selCreated: StartEnd
    selPaid: StartEnd
    ranges: any = DATESPAN_RANGE
    currentFilter: string

    observer: Observable<Invoice[]>

    //filtersUpdated = (e:any) => this.reload()

    constructor(
        private invoiceService: InvoiceService
    ) { }


    ngOnInit(): void {
        this.reload()
    }

    reload() {
        const filters: any = Object.assign({}, this.filters())
        if (JSON.stringify(filters) != this.currentFilter) {  // prevent multi-loading triggered when form fields are bound to variables
            this.currentFilter = JSON.stringify(filters)
            this.invoices = []
            this.hasLoaded = false
            this.observer = this.invoiceService.index(filters)
        }
    }

    onResult = (result: Invoice[]) => { this.hasLoaded = true; this.invoices = this.invoices.concat(result) }

    filters = () => ({
        onlyUnpaid  : this.onlyUnpaid,
        onlyPaid    : this.onlyPaid,
        createdStart: this.selCreated?.startDate?.format('DD.MM.YYYY'),
        createdEnd  : this.selCreated?.endDate?.format('DD.MM.YYYY'),
        paidStart   : this.selPaid?.startDate?.format('DD.MM.YYYY'),
        paidEnd     : this.selPaid?.endDate?.format('DD.MM.YYYY'),
    });

}
