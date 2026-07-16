import { Injectable } from '@angular/core';
import { Dictionary } from '@constants/constants';
import { Invoice } from './invoice/invoice.model';
import { ApiType, NexusHttpService } from './http/http.nexus';
import { Serializable } from './serializable';
import { map } from 'rxjs';
import { JubileeEntry, WorkingTimeResponse, CashflowSeries } from './api-response';

export const mapToObject = <T>(item: unknown, type: ApiType<T>): T => typeof type.fromJson === 'function' ? (type.fromJson(item) as T) : (item as T);
@Injectable({ providedIn: 'root' })
export class WidgetService extends NexusHttpService<Serializable> {
    apiPath = 'widgets';
    preparedInvoices        = (options: Dictionary = {}) => this.get<Dictionary>('widgets/prepared-invoices', options);
    unpaidInvoices          = () => this.aget('widgets/unpaid-invoices', {}, Invoice);
    indexJubilees           = () => this.aget<JubileeEntry>('widgets/index-jubilees', {});
    indexTimeBasedEmployees = () => this.aget<WorkingTimeResponse>('widgets/index-time-based-employees');
    indexNewItems           = () => this.aget('widgets/new-items', {}, Object);
    indexCashflow           = <T>(param: string, options: Dictionary = {}, _type: ApiType<T>) =>
        this.get<CashflowSeries<T>>(`widgets/cashflow/${param}`, options)
            .pipe(map((response) => ({
                ...response,
                objects: [response.objects]
                    .flat()
                    .map((item) => mapToObject<T>(item, _type)),
            })),
        );
}
