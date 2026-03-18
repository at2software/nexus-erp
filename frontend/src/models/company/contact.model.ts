import { ContactService } from "src/models/company/contact.service"
import type { CompanyContact } from "./company-contact.model"
import { VcardClass } from "../vcard/VcardClass"
import type { Company } from "./company.model"
import { AutoWrapArray } from "@constants/autowrap"

export class Contact extends VcardClass {

    static API_PATH = (): string => 'contacts'
    SERVICE = ContactService

    @AutoWrapArray('CompanyContact') company_contacts:CompanyContact[]
    @AutoWrapArray('Company') companies:Company[]

    qr_code?: string;
    qr_code_content?: string;

}
