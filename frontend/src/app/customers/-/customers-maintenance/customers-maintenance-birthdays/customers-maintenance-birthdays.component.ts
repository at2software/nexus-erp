import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import moment from 'moment';
import { Toast } from '@shards/toast/toast';
import { Contact } from '@models/company/contact.model';
import { ContactService } from '@models/company/contact.service';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'customers-maintenance-birthdays',
    templateUrl: './customers-maintenance-birthdays.component.html',
    styleUrls: ['./customers-maintenance-birthdays.component.scss'],
    standalone: true,
    imports: [Nx, AvatarComponent, FormsModule],
})
export class CustomersMaintenanceBirthdaysComponent implements OnInit {
    contacts = signal<Contact[]>([]);
    #contactService = inject(ContactService);
    ngOnInit() {
        this.#contactService.maintenanceMissingBirthdays().subscribe((data) => {
            data.forEach((_) => (_.var.bday = undefined));
            this.contacts.set(data);
        });
    }
    onUpdate(contact: Contact) {
        const m = moment(contact.var.bday);
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
