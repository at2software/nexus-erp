import { Injectable } from '@angular/core';
import { Company } from 'src/models/company/company.model';
import { CompanyContact } from 'src/models/company/company-contact.model';
import { PdfCreationType } from 'src/enums/PdfCreationType';
import { NexusHttpService } from '../http/http.nexus';
import { Connection } from './connection.model';
import { NxGlobal } from '@app/nx/nx.global';

@Injectable({ providedIn: 'root' })
export class CompanyService extends NexusHttpService<Company> {

    apiPath = 'companies'

    TYPE = () => Company
    indexSupport = (options: any = {}) => this.aget(`companies/support`, options)
    show = (id: string) => this.get(`companies/${id}`)
    showForPath = (path: string) => this.show(path.split('/')[1])
    showConnections = (_: Company) => this.aget(`companies/${_.id}/connections`, {}, Connection)
    indexAllConnections = () => this.aget(`connections`, {}, Connection)
    destroy = (id: string) => this.delete(`companies/${id}`)
    create = (name: string = 'New company') => this.post('companies', { name: name })
    createEmployee = (id: string) => this.post(`companies/${id}/employees`, CompanyContact)
    updateGeneric = (id: string, api: string, data: object) => this.put(api + '/' + id, data)
    importImprint = (_: Company) => this.get(`companies/${_.id}/import_imprint`)
    getByPhone = (phone_number: string) => this.get(`companies/by-phone`, {phone_number: phone_number})

    makeInvoice (_: Company, success?: () => unknown) {
        const download = NxGlobal.global.user!.getFloatParam('INVOICE_DOWNLOAD', 1)
        if (download === 1) {
            return this.getFile(`companies/${_.id}/invoice`, { type: PdfCreationType.Create }, success)
        } else {
            return this.get(`companies/${_.id}/invoice`, { type: PdfCreationType.Create }).subscribe(success)
        }
    }

    activateRepeatingItems = (companyId: string | number) => this.put(`companies/${companyId}/activate-repeating-items`, {})

    maintenanceCommercialRegister = () => this.aget('companies/maintenance/commercial-register')

    // stats
    getRevenueStats = (c: Company) => this.aget(`companies/${c.id}/stats-revenue`, Object)
    getProjectStats = (c: Company) => this.aget(`companies/${c.id}/stats-projects`, Object)
    
    // map
    getWithCoordinates = () => this.aget('companies/with-coordinates', {}, Object)
}
