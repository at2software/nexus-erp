import { CompanyContact } from './company-contact.model';
import { VcardClass } from '../vcard/vcard-class.model';
import { Company } from './company.model';
import { Type } from '@models/_core/hydrate';
import { Model } from '@constants/model/type-discriminators';

@Model('Contact')
export class Contact extends VcardClass {
    static API_PATH = (): string => 'contacts';

    @Type(()=>CompanyContact) company_contacts!: CompanyContact[];
    @Type(()=>Company) companies!: Company[];

    qr_code?: string;
    qr_code_content?: string;
}
