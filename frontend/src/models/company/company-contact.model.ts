import { CompanyContactService } from '@models/company/company-contact.service';
import { Contact } from './contact.model';
import { VcardClass } from '../vcard/VcardClass';
import { Project } from '../project/project.model';
import { Company } from './company.model';
import { Type } from 'class-transformer';
import { getCompanyContactActions } from './company-contact.actions';
import { Model } from '@constants/type-discriminators';
import { computed } from '@angular/core';
import { environment } from 'src/environments/environment';

@Model('CompanyContact')
export class CompanyContact extends VcardClass {
    static override API_PATH = (): string => 'company_contacts';
    override SERVICE = CompanyContactService;

    doubleClickAction: number = 0;
    actions = getCompanyContactActions(this);

    company_id: string = '';
    contact_id: string = '';
    is_retired: boolean = false;
    is_favorite: boolean = false;
    is_invoicing_address: boolean = false;

    @Type(()=>Company) company!: Company;
    @Type(()=>Contact) contact!: Contact;
    @Type(()=>Project) projects!: Project;

    getName = computed(() => this.contact?.getName());

    override get gender(): string { return this.contact?.gender ?? ''; }
    protected override readonly computedIcon = computed(() => environment.envApi + `companies/${this.snapshot().company_id}/icon`);

    getPersonal = (): VcardClass | undefined => this.contact;

    frontendUrl = (): string => `/customers/${this.company_id}/contacts/${this.id}`;
}
