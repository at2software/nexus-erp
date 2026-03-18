import { Serializable } from "../serializable";
import { Company } from "./company.model";
import { CompanyService } from "./company.service";
import { AutoWrap } from "@constants/autowrap";
import { Connection } from "./connection.model";

export class ConnectionProjects extends Serializable {
    
    static API_PATH = (): string => 'connection_projects'

    SERVICE = CompanyService

    connection_id : string = ''
    @AutoWrap('Company') other_company : Company
    @AutoWrap('Connection') connection : Connection
    
    frontendUrl = (): string => `/customers/${this.other_company.id}`

}