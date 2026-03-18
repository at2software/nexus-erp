import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NexusModule } from '@app/nx/nexus.module';
import { CashRegister } from '@models/cash/cash.register.model';
import { CashService } from '@models/cash/cash.servcie';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

@Component({
    selector: 'invoices-cash-register',
    templateUrl: './invoices-cash-register.component.html',
    styleUrls: ['./invoices-cash-register.component.scss'],
    standalone: true,
    imports: [NexusModule, RouterModule, EmptyStateComponent]
})
export class InvoicesCashRegisterComponent implements OnInit {
    #cashService = inject(CashService)
    registers:CashRegister[] = []
    isLoaded = false
    ngOnInit() {
        this.#cashService.indexRegisters().subscribe(data => {
            this.isLoaded = true
            this.registers = data
        })
    }
}
