import { Serializable } from '../serializable';
import { Company } from './company.model';
import { CompanyService } from './company.service';
import { Type } from 'class-transformer';
import { Connection } from './connection.model';
import { Model } from '@constants/type-discriminators';

@Model('ConnectionProjects')
export class ConnectionProjects extends Serializable {
    static API_PATH = (): string => 'connection_projects';

    SERVICE = CompanyService;

    connection_id: string = '';
    @Type(()=>Company) other_company!: Company;
    @Type(()=>Connection) connection!: Connection;

    frontendUrl = (): string => `/customers/${this.other_company.id}`;
}
