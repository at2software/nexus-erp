import { DatePipe } from '@angular/common';
import { Component, inject, TemplateRef, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { NexusModule } from '@app/nx/nexus.module';
import { AffixInputDirective } from '@directives/affix-input.directive';
import { NgbDateAdapter, NgbDatepickerModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SaldoChartComponent } from '@shards/saldo-chart/saldo-chart.component';
import moment from 'moment';
import { NgbDateCarbonAdapter } from '@directives/ngb-date.adapter';
import { Cash } from '@models/cash/cash.model';
import { CashService } from '@models/cash/cash.servcie';
import { GlobalService } from '@models/global.service';
import { MoneyPipe } from '../../../../pipes/money.pipe';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    selector: 'invoices-cash-register-detail',
    templateUrl: './invoices-cash-register-detail.component.html',
    styleUrls: ['./invoices-cash-register-detail.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    standalone: true,
    imports: [ToolbarComponent, NexusModule, SaldoChartComponent, NgbDatepickerModule, FormsModule, AffixInputDirective, MoneyPipe, DatePipe, HotkeyDirective]
})
export class InvoicesCashRegisterDetailComponent implements OnInit {

    id:string
    entries:Cash[] = []

    modalData = {
        occured_at : moment().toISOString(),
        description: '',
        approver   : '',
        value      : 0
    }

    global = inject(GlobalService)
    route = inject(ActivatedRoute)
    #cashService = inject(CashService)
	modalService = inject(NgbModal)

    min:number = 0
    max:number = 0

    ngOnInit() {
        this.route.params.subscribe(_ => {
            this.id = _['id']
            this.reload()
            this.modalData = {
                occured_at : moment().toISOString(),
                description: '',
                approver   : this.global.user?.name ?? '',
                value      : 0
            }
        })
    }
    reload() {
        this.#cashService.indexEntries(this.id).subscribe(data => {
            this.entries = data
            let v = 0
            this.max = 0
            this.min = 0
            this.entries.reverse().forEach(_ => {
                _.var.current = v
                v += _.value
                this.max = Math.max(this.max, v)
                this.min = Math.min(this.min, v)
            })
            this.entries.reverse()
        })
    }

    addExpense(content: TemplateRef<any>) {
		this.modalService.open(content, { ariaLabelledBy: 'modal-basic-title' }).result.then(() => { 
            this.#cashService.storeEntry(this.id, this.modalData).subscribe(() => this.reload())
        }).catch()
    }

}
