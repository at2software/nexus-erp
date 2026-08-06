import { Service } from '@angular/core';
import { Contact } from '@models/company/contact.model';
import { NexusHttpService } from '../http/http.nexus';

@Service()
export class ContactService extends NexusHttpService<Contact> {
    apiPath = 'contacts';
    override readonly model = Contact;
    createAt2ConnectToken = (id: string) => this.post(`contacts/${id}/at2-connect-token`, {}, Object);
    deleteAt2ConnectToken = (id: string) => this.delete(`contacts/${id}/at2-connect-token`, {}, Object);
    maintenanceMissingBirthdays = () => this.aget('contacts/maintenance/birthdays');
}
