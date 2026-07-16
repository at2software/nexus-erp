import { Injectable } from '@angular/core';
import { Company } from '@models/company/company.model';
import { CompanyContact } from '@models/company/company-contact.model';
import { PdfCreationType } from '@enums/PdfCreationType';
import { NexusHttpService } from '../http/http.nexus';
import { Connection } from './connection.model';
import { Dictionary } from '@constants/constants';
import { NxGlobal } from '@app/nx/nx.global';
import { CustomerLocation, MonthlyBiasData } from '@models/api-response';

@Injectable({ providedIn: 'root' })
export class CompanyService extends NexusHttpService<Company> {
    apiPath = 'companies';

    override readonly model = Company;

    indexSupport = (options: Dictionary = {}) => this.aget(`companies/support`, options);
    /** Model C actionable output: customers ranked by ML churn probability, highest risk first. Powers widget-customer-churn. */
    indexByChurnRisk = () => this.aget('companies/churn-risk');
    showForPath = (path: string) => this.show(path.split('/')[1]);
    showConnections = (_: Company) => this.aget(`companies/${_.id}/connections`, {}, Connection);
    indexAllConnections = () => this.aget(`connections`, {}, Connection);
    create = (name: string = 'New company') => this.post('companies', { name: name });
    createEmployee = (id: string) => this.post(`companies/${id}/employees`, {}, CompanyContact);
    updateGeneric = (id: string, api: string, data: object) => this.put(api + '/' + id, data);
    importImprint = (_: Company) => this.get(`companies/${_.id}/import_imprint`);
    getByPhone = (phone_number: string) => this.get(`companies/by-phone`, { phone_number: phone_number });

    makeInvoice(_: Company, success?: () => unknown, draft = false) {
        const params: Dictionary = draft ? { type: PdfCreationType.Create, draft: 1 } : { type: PdfCreationType.Create };
        // A draft is never persisted, so it must always be downloaded from the response — the
        // "view stored invoice" path (getBlob + navigate) has nothing to show afterwards.
        const download = NxGlobal.global.user!.getFloatParam('INVOICE_DOWNLOAD', 1);
        if (draft || download === 1) {
            return this.getFile(`companies/${_.id}/invoice`, params, success);
        } else {
            return this.getBlob(`companies/${_.id}/invoice`, params).subscribe({ next: () => success?.() });
        }
    }

    activateRepeatingItems = (companyId: string | number) => this.put(`companies/${companyId}/activate-repeating-items`, {});

    maintenanceCommercialRegister = () => this.aget('companies/maintenance/commercial-register');

    // stats
    getRevenueStats = (c: Company) => this.aget(`companies/${c.id}/stats-revenue`, {}, Object);
    getProjectStats = (c: Company) => this.aget(`companies/${c.id}/stats-projects`, {}, Object);
    getPredictionAccuracy = (c: Company) => this.aget<MonthlyBiasData>(`companies/${c.id}/prediction-accuracy`);

    // map
    getWithCoordinates = () => this.aget<CustomerLocation>('companies/with-coordinates');
}
