import { Injectable } from '@angular/core';
import { CompanyContact } from 'src/models/company/company-contact.model';
import { NexusHttpService } from '../http/http.nexus';

@Injectable({ providedIn: 'root' })
export class CompanyContactService extends NexusHttpService<CompanyContact> {
    override apiPath = 'company_contacts'
    override TYPE = () => CompanyContact
    show = (id: string) => this.get(`company_contacts/${id}`, { with: 'contact'})
    store = (payload:any) => this.post('company_contacts', payload)
    unlink = (contactId:string, companyId:string) => this.put(`contacts/${contactId}/unlink/${companyId}`)
}
