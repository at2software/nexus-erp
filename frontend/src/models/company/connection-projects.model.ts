import { Serializable } from '@models/_core/serializable';
import { Company } from './company.model';
import { Type } from '@models/_core/hydrate';
import { Connection } from './connection.model';
import { Model } from '@constants/model/type-discriminators';

@Model('ConnectionProjects')
export class ConnectionProjects extends Serializable {
    static API_PATH = (): string => 'connection_projects';


    connection_id: string = '';
    @Type(()=>Company) other_company!: Company;
    @Type(()=>Connection) connection!: Connection;

    frontendUrl = (): string => `/customers/${this.other_company.id}`;
}
