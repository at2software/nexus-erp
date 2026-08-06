import { ChangeDetectionStrategy, Component, inject, linkedSignal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { dayjs } from '@constants/date/dates';
import { Toast } from '@shards/toast/toast';
import { Contact } from '@models/company/contact.model';
import { ContactService } from '@models/company/contact.service';
import { modelListResource } from '@models/http/model-resource';
import { StackedTableDirective } from '@directives/stacked-table.directive';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'customers-maintenance-birthdays',
    templateUrl: './customers-maintenance-birthdays.component.html',
    imports: [StackedTableDirective, Nx, AvatarComponent, FormsModule],
})
export class CustomersMaintenanceBirthdaysComponent {
    #contactService = inject(ContactService);

    #contacts = modelListResource(() => this.#contactService.maintenanceMissingBirthdays());
    contacts = linkedSignal<Contact[], Contact[]>({
        source: this.#contacts.value,
        computation: (rows) => {
            rows.forEach((_) => (_.var.bday = undefined));
            return rows;
        },
    });

    onUpdate(contact: Contact) {
        const m = dayjs(contact.var.bday);
        if (!contact.var.bday.match(/\d{4}-\d{2}-\d{2}/)) {
            Toast.warn($localize`:@@i18n.validation.invalid_birthday_format:invalid birthday format`);
            return;
        }
        if (!m.isValid) {
            Toast.warn($localize`:@@i18n.validation.invalid_birthday_format:invalid birthday format`);
            return;
        }
        contact.update({ vcard: contact.getVcardString() + '\nBDAY:' + m.format('YYYY-MM-DD') }).subscribe();
    }
}
