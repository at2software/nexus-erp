import { NxAction } from '@app/nx/nx.actions';
import { Serializable } from '../serializable';
import { Company } from './company.model';
import { CompanyService } from './company.service';
import { Type } from 'class-transformer';
import { getConnectisingleActionResolveds } from './connection.actions';
import { Model } from '@constants/type-discriminators';

@Model('Connection')
export class Connection extends Serializable {
    SERVICE = CompanyService;

    net: number = 0;
    projects_count: number = 0;
    company1_id: string = '';
    company2_id: string = '';
    @Type(()=>Company) other_company!: Company;
    @Type(()=>Company) company1!: Company;
    @Type(()=>Company) company2!: Company;

    doubleClickAction: number = 0;
    actions: NxAction[] = getConnectisingleActionResolveds(this);

    static API_PATH = (): string => 'connections';

    frontendUrl = (): string => `/customers/${this.other_company.id}`;
    otherCompany = (_: Company): Company | undefined => ((this.other_company ?? this.company1_id == _.id) ? this.company2 : this.company1);
    addCompanyAction = (_: Company | undefined) => {
        if (_) this.actions.unshift({ title: 'Open ' + _.getName(), action: () => this.navigateTo(`/customers/${_.id}`) });
    };
}
