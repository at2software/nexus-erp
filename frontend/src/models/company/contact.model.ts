import { ContactService } from '@models/company/contact.service';
import { CompanyContact } from './company-contact.model';
import { VcardClass } from '../vcard/VcardClass';
import { Company } from './company.model';
import { Type } from 'class-transformer';
import { Model } from '@constants/type-discriminators';

@Model('Contact')
export class Contact extends VcardClass {
    static API_PATH = (): string => 'contacts';
    SERVICE = ContactService;

    @Type(()=>CompanyContact) company_contacts!: CompanyContact[];
    @Type(()=>Company) companies!: Company[];

    qr_code?: string;
    qr_code_content?: string;
}
