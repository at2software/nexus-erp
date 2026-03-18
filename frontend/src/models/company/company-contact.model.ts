import { CompanyContactService } from "src/models/company/company-contact.service"
import { Contact } from "./contact.model"
import { VcardClass } from "../vcard/VcardClass"
import type { Project } from "../project/project.model"
import { Company } from "./company.model"
import { AutoWrap, AutoWrapArray } from "@constants/autowrap"
import { getCompanyContactActions } from "./company-contact.actions"

export class CompanyContact extends VcardClass {

    static override API_PATH = (): string => 'company_contacts'
    override SERVICE = CompanyContactService

    doubleClickAction: number = 0
    actions = getCompanyContactActions(this)

    company_id: string = ''
    contact_id: string = ''
    is_retired: boolean = false
    is_favorite: boolean = false
    is_invoicing_address: boolean = false

    @AutoWrap('Company') company: Company
    @AutoWrap('Contact') contact: Contact
    @AutoWrapArray('Project') projects: Project

    get name(): string {
        return this.contact?.card?.name || ''
    }

    serialize (_json: any) {
        super.serialize(_json)
        this.gender = this.contact?.gender
        this.honoraryPrefix = this.contact?.honoraryPrefix
        this.honorarySuffix = this.contact?.honorarySuffix
        this.icon = `companies/${this.company_id}/icon`
    }

    getPersonal = (): VcardClass|undefined => this.contact

    frontendUrl = (): string => `/customers/${this.company_id}/contacts/${this.id}`
    canLinkToMantis = (): boolean => this.canLinkToPluginByName('mantis')
    linkToMantisUser = async () => {
        const { MantisPlugin } = await import("../http/plugin.mantis");
        this.linkToInstance(MantisPlugin);
    }

}