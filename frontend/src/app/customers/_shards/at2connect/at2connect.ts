import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Contact } from '@models/company/contact.model';
import { ContactService } from '@models/company/contact.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { tracked } from '@constants/tracked';
import { CustomerDetailGuard } from '@app/customers/customers.details.guard';

@Component({
    selector: 'at2connect',
    templateUrl: './at2connect.html',
    imports: [NgbTooltipModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class At2connect {
    readonly contact = input.required<Contact>();
    readonly trackedContact = tracked(this.contact);

    #cService = inject(ContactService);
    #parent = inject(CustomerDetailGuard);

    createAt2ConnectToken = () =>
        this.#cService.createAt2ConnectToken(this.trackedContact().id).subscribe((_) => {
            this.trackedContact().qr_code = _.qr_code;
            this.#parent.touch();
        });
    deleteAt2ConnectToken = () =>
        this.#cService.deleteAt2ConnectToken(this.trackedContact().id).subscribe((_) => {
            this.trackedContact().qr_code = _.qr_code;
            this.#parent.touch();
        });
    openAt2Connect = () => window.open(this.trackedContact().qr_code_content, '_blank');
}
