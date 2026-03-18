
import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NexusModule } from '@app/nx/nexus.module';
import moment from 'moment';
import { Toast } from 'src/app/_shards/toast/toast';
import { Contact } from 'src/models/company/contact.model';
import { ContactService } from 'src/models/company/contact.service';

@Component({
    selector: 'customers-maintenance-birthdays',
    templateUrl: './customers-maintenance-birthdays.component.html',
    styleUrls: ['./customers-maintenance-birthdays.component.scss'],
    standalone: true,
    imports: [NexusModule, FormsModule]
})
export class CustomersMaintenanceBirthdaysComponent implements OnInit {
    contacts:Contact[]
    #contactService = inject(ContactService)
    ngOnInit() {
        this.#contactService.maintenanceMissingBirthdays().subscribe(data => {
            data.forEach(_ => _.var.bday = undefined)
            this.contacts = data
        })
    }
    onUpdate(contact:Contact) {
        const m = moment(contact.var.bday)
        if (!contact.var.bday.match(/\d{4}-\d{2}-\d{2}/)){
            Toast.warn($localize`:@@i18n.validation.invalid_birthday_format:invalid birthday format`)
            return
        }
        if (!m.isValid) {
            Toast.warn($localize`:@@i18n.validation.invalid_birthday_format:invalid birthday format`)
            return
        }
        contact.update({vcard: contact.vcard + "\nBDAY:" + m.format('YYYY-MM-DD') }).subscribe()        
    }
}
