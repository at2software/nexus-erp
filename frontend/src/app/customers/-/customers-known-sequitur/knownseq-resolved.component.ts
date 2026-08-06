import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CustomerDetailGuard } from '@app/customers/customers.details.guard';
import { CustomersKnownSequiturComponent } from './customers-known-sequitur.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'knownseq-resolved',
    template: `<customers-known-sequitur [company]="guard.object()" />`,
    imports: [CustomersKnownSequiturComponent],
})
export class KnownSequiturResolvedComponent {
    protected guard = inject(CustomerDetailGuard);
}
