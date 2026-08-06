import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { Nx } from '@app/nx/nx.directive';
import { CashService } from '@models/cash/cash.service';
import { modelListResource } from '@models/http/model-resource';
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

    readonly #registers = modelListResource(() => this.#cashService.indexRegisters());
    registers = this.#registers.value;
    isLoaded = computed(() => this.#registers.hasValue());

    constructor() {
        effect(() => {
            const registers = this.registers();
            if (registers.length && !this.#route.firstChild) {
                this.#router.navigate([registers[0].id], { relativeTo: this.#route });
            }
        });
    }
}
