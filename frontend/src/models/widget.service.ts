import { Injectable } from "@angular/core";
import { Invoice } from "./invoice/invoice.model";
import { NexusHttpService } from "./http/http.nexus";
import { map } from "rxjs";

@Injectable({ providedIn: 'root' })
export class WidgetService extends NexusHttpService<any> {
	apiPath = 'widgets'
    preparedInvoices = (options:any = {}) => this.get('widgets/prepared-invoices', options)
    unpaidInvoices = () => this.aget('widgets/unpaid-invoices', {}, Invoice)
    indexJubilees = () => this.aget('widgets/index-jubilees', {}, Object)
    indexTimeBasedEmployees = () => this.aget('widgets/index-time-based-employees', Object)
    indexNewItems = () => this.aget('widgets/new-items', {}, Object)
    indexCashflow = (param: string, options: any = {}, type: any = Object) => this.aget(`widgets/cashflow/${param}`, options, Object).pipe(map((response: any) => {
        response.objects = response.objects.map((item: any) => type.fromJson?.(item) ?? item)
        return response
    }))
}