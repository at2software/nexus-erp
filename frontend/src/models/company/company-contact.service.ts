import { Service } from '@angular/core';
import { Dictionary } from '@constants/constants';
import { CompanyContact } from '@models/company/company-contact.model';
import { NexusHttpService } from '../http/http.nexus';

@Service()
export class CompanyContactService extends NexusHttpService<CompanyContact> {
    override apiPath = 'company_contacts';
    override readonly model = CompanyContact;
    show = (id: string) => this.get(`company_contacts/${id}`, { with: 'contact' });
    link = <U = CompanyContact>(payload: Dictionary) => this.post<U>('company_contacts', payload);
    unlink = (contactId: string, companyId: string) => this.put(`contacts/${contactId}/unlink/${companyId}`);
}
