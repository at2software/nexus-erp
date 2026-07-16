import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Nx } from '@app/nx/nx.directive';
import { CashRegister } from '@models/cash/cash.register.model';
import { CashService } from '@models/cash/cash.servcie';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'invoices-cash-register',
    templateUrl: './invoices-cash-register.component.html',
    imports: [Nx, RouterModule, EmptyStateComponent],
})
export class InvoicesCashRegisterComponent {
    #cashService = inject(CashService);
    #router = inject(Router);
    #route = inject(ActivatedRoute);

    registers = signal<CashRegister[]>([]);
    isLoaded = signal(false);

    constructor() {
        this.#cashService.indexRegisters().subscribe((data) => {
            this.isLoaded.set(true);
            this.registers.set(data);
            if (data.length && !this.#route.firstChild) {
                this.#router.navigate([data[0].id], { relativeTo: this.#route });
            }
        });
    }
}
