import { NxAction } from '@models/_core/nx.actions';
import { Serializable } from '@models/_core/serializable';
import { Company } from './company.model';
import { Type } from '@models/_core/hydrate';
import { getConnectisingleActionResolveds } from './connection.actions';
import { Model } from '@constants/model/type-discriminators';

@Model('Connection')
export class Connection extends Serializable {

    net: number = 0;
    projects_count: number = 0;
    company1_id: string = '';
    company2_id: string = '';
    @Type(()=>Company) other_company!: Company;
    @Type(()=>Company) company1!: Company;
    @Type(()=>Company) company2!: Company;

    protected override buildActions(): NxAction[] { return getConnectisingleActionResolveds(this) }

    static API_PATH = (): string => 'connections';

    frontendUrl = (): string => `/customers/${this.other_company.id}`;
    otherCompany = (_: Company): Company | undefined => ((this.other_company ?? this.company1_id == _.id) ? this.company2 : this.company1);
    addCompanyAction = (_: Company | undefined) => {
        if (_) this.actions.unshift({ title: 'Open ' + _.getName(), action: () => this.navigateTo(`/customers/${_.id}`) });
    };
}
