import { Injectable } from '@angular/core';
import { Focus } from 'src/models/focus/focus.model';
import { Serializable } from 'src/models/serializable';
import { NexusHttpService } from '../http/http.nexus';
import { InvoiceItem } from '../invoice/invoice-item.model';
import { Project } from '../project/project.model';
import { Company } from '../company/company.model';
import { Observable } from 'rxjs';
import { User } from '../user/user.model';

@Injectable({ providedIn: 'root' })
export class FocusService extends NexusHttpService<Focus> {
    public apiPath = 'foci'
    public TYPE = () => Focus
    indexFor = (_: Serializable) => this.aget(`${_.getApiPathWithId()}/foci`)
    storeFor = (date:string, duration:number, user:User) => this.post('foci', { date: date, duration:duration, user_id: user.id }, Focus)
    getFociFor(project: Project, userIds?: string[], sortField?: string, sortDirection?: string, notYetInvoiced?: boolean, startDate?: string, endDate?: string): Observable<Focus[]>;
    getFociFor(company: Company, userIds?: string[], sortField?: string, sortDirection?: string, notYetInvoiced?: boolean, startDate?: string, endDate?: string): Observable<Focus[]>;
    getFociFor(_: Project | Company, userIds?: string[], sortField?: string, sortDirection?: string, notYetInvoiced?: boolean, startDate?: string, endDate?: string): Observable<Focus[]> {
        const params: any = {}

        if (userIds && userIds.length > 0) {
            params.users = userIds.join(',')
        }

        if (sortField) {
            params.sort = sortField
            params.direction = sortDirection || 'desc'
        }

        if (notYetInvoiced) {
            params.not_yet_invoiced = true
        }

        if (startDate) {
            params.start_date = startDate
        }

        if (endDate) {
            params.end_date = endDate
        }

        return this.aget(`${_.getApiPathWithId()}/foci`, params)
    }
    uninvoicedFoci = (_: Serializable) => this.aget(`foci/uninvoiced/${_.getApiPathWithId()}`)

    createInvoiceItemsFor = (_: Serializable, itemIds: string[], desc: string, duration: number, productId: string) => this.post(`foci/create-items/${_.getApiPathWithId()}`, {
        'itemIds': itemIds,
        'desc': desc,
        'duration': duration,
        'productId': productId
    }, InvoiceItem)
}