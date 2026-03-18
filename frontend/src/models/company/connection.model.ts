import { NxAction } from "src/app/nx/nx.actions";
import { Serializable } from "../serializable";
import { Company } from "./company.model";
import { CompanyService } from "./company.service";
import { AutoWrap } from "@constants/autowrap";
import { getConnectisingleActionResolveds } from "./connection.actions";

export class Connection extends Serializable {
    SERVICE = CompanyService

    net      :number  = 0
    projects_count:number = 0
    company1_id:string
    company2_id:string
    @AutoWrap('Company') other_company:Company
    @AutoWrap('Company') company1:Company
    @AutoWrap('Company') company2:Company

    doubleClickAction: number = 0
    actions:NxAction[] = getConnectisingleActionResolveds(this)
    
    static API_PATH = (): string => 'connections'
    
    frontendUrl = (): string => `/customers/${this.other_company.id}`
    otherCompany = (_:Company):Company | undefined => this.other_company ?? this.company1_id == _.id ? this.company2 : this.company1
    addCompanyAction = (_:Company | undefined) => {
        if (_) this.actions.unshift({ title: 'Open ' + _.name, action: () => this.navigate(`/customers/${_.id}`)})
    }
    
}