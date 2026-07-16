import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, TemplateRef, computed, effect, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { Nx } from '@app/nx/nx.directive';
import { NgbDateAdapter, NgbDatepickerModule, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { SaldoChartComponent } from '@shards/saldo-chart/saldo-chart.component';
import { dayjs } from '@constants/dates';
import { NgbDateCarbonAdapter } from '@directives/ngb-date.adapter';
import { Cash } from '@models/cash/cash.model';
import { CashService } from '@models/cash/cash.servcie';
import { GlobalService } from '@models/global.service';
import { MoneyPipe } from '@pipes/money.pipe';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'invoices-cash-register-detail',
    templateUrl: './invoices-cash-register-detail.component.html',
    styleUrls: ['./invoices-cash-register-detail.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    imports: [ToolbarComponent, Nx, SaldoChartComponent, NgbDatepickerModule, FormsModule, MoneyPipe, DatePipe, HotkeyDirective],
})
export class InvoicesCashRegisterDetailComponent {

    #global = inject(GlobalService);
    #route = inject(ActivatedRoute);
    #cashService = inject(CashService);
    #modalService = inject(NgbModal);

    id = signal('');
    entries = signal<Cash[]>([]);
    
    min = computed(() => this.entries().reduce((m, e) => Math.min(m, e.var.current + e.value), 0));
    max = computed(() => this.entries().reduce((m, e) => Math.max(m, e.var.current + e.value), 0));
    currencySymbol = computed(() => this.#global.currencySymbol() ?? '€');

    modalData = signal({
        occured_at: dayjs().toISOString(),
        description: '',
        approver: '',
        value: 0,
    });

    constructor() {
        this.#route.params.pipe(takeUntilDestroyed()).subscribe(p => this.id.set(p['id']));

        effect(() => {
            if (!this.id()) return;
            this.modalData.set({
                occured_at: dayjs().toISOString(),
                description: '',
                approver: this.#global.user?.getName() ?? '',
                value: 0,
            });
            this.reload();
        });
    }

    reload() {
        this.#cashService.indexEntries(this.id()).subscribe((data) => {
            let v = 0;
            data.reverse().forEach(_ => {
                _.var.current = v;
                v += _.value;
            });
            this.entries.set(data.reverse());
        });
    }

    addExpense(content: TemplateRef<unknown>) {
        this.#modalService
            .open(content, { ariaLabelledBy: 'modal-basic-title' })
            .result.then(() => {
                this.#cashService.storeEntry(this.id(), this.modalData()).subscribe(() => this.reload());
            })
            .catch();
    }
}
