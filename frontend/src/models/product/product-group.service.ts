import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { ProductGroup } from './product-group.model';
import { NexusHttpService } from '../http/http.nexus';
import { Company } from '../company/company.model';

@Injectable({
    providedIn: 'root'
})
export class ProductGroupService extends NexusHttpService<ProductGroup> {

    public apiPath = 'product_groups'
    public TYPE = () => ProductGroup

    show = (id: string) => this.get(`product_groups/${id}`)
    indexCustomers = (p: ProductGroup) => this.get(`product_groups/${p.id}/customers`).pipe(
        map((data: any) => ({
            customers: (data.customers as any[]).map(c => Company.fromJson(c)),
            total_revenue: data.total_revenue as number,
            total_customers: data.total_customers as number,
        }))
    )
}
