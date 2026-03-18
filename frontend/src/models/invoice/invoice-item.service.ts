import { Injectable } from '@angular/core';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { Dictionary } from 'src/constants/constants';
import { NexusHttpService } from '@models/http/http.nexus';
import { Company } from '@models/company/company.model';
import { Project } from '@models/project/project.model';
import { Serializable } from '@models/serializable';

@Injectable({ providedIn: 'root' })
export class InvoiceItemService extends NexusHttpService<InvoiceItem> {
    public apiPath = 'invoice-items'
    public TYPE = () => InvoiceItem

    getInvoiceItems = (parent: Serializable, data?: Dictionary | undefined) => this.aget(parent.getApiPathWithId() + '/invoice-items', data)
    getSupportItems = (parent: Serializable, data?: Dictionary | undefined) => this.aget(parent.getApiPathWithId() + '/support-items', data)
    
    indexStandingOrders = (company?:Company) => this.aget('invoice_items/standing-orders', company ? { company_id: company.id } : {})

    destroy = (item: InvoiceItem) => this.delete(`invoice_items/${item.id}`)
    store = (item: InvoiceItem) => this.post('invoice_items', item)
    update = (item: InvoiceItem) => this.put(`invoice_items/${item.id}`, item)
    prepareInvoice = (project:Project) => this.post(`projects/${project.id}/prepare_invoice`)

    reorder = (_:string[]) => this.put('invoice_items/reorder', { order: _ })
    combine = (itemIds: string[], description: string) => this.post('invoice_items/combine', { item_ids: itemIds, description })
}