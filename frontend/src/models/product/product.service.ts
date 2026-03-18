import { Injectable } from '@angular/core';
import { map } from 'rxjs';
import { Product } from './product.model';
import { NexusHttpService } from '../http/http.nexus';
import { Company } from '../company/company.model';

@Injectable({ providedIn: 'root' })
export class ProductService extends NexusHttpService<Product> {
    public apiPath = 'products'
    public TYPE = () => Product
    show = (id: string) => this.get(`products/${id}`, { with: 'invoice_items' })
    indexCustomers = (p: Product) => this.get(`products/${p.id}/customers`).pipe(
        map((data: any) => ({
            customers: (data.customers as any[]).map(c => Company.fromJson(c)),
            total_revenue: data.total_revenue as number,
            total_customers: data.total_customers as number,
        }))
    )
    showStatistics = (filters?: any) => this.get('products/statistics', filters || {}, Object)
    getRootGroups = () => this.aget('products/root-groups', {}, Object)
    getSplit = (id: number) => this.get(`products/${id}/split`, {}, Array)
}
