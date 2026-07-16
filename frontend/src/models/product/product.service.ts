import { Injectable } from '@angular/core';
import { Dictionary } from '@constants/constants';
import { map } from 'rxjs';
import { Product } from './product.model';
import { NexusHttpService } from '../http/http.nexus';
import { Company } from '../company/company.model';
import { ProductGroup } from './product-group.model';
import { ProductSplitItem } from '@models/api-response';

@Injectable({ providedIn: 'root' })
export class ProductService extends NexusHttpService<Product> {
    public apiPath = 'products';
    override readonly model = Product;
    show = (id: string) => this.get(`products/${id}`, { with: 'invoice_items' });
    indexCustomers = (p: Product) =>
        this.get(`products/${p.id}/customers`, {}, Object).pipe(
            map((d: { customers: Dictionary[]; total_revenue: number; total_customers: number }) => ({
                customers: d.customers.map((c) => Company.fromJson(c)),
                total_revenue: d.total_revenue,
                total_customers: d.total_customers,
            })),
        );
    showStatistics = (filters?: Dictionary) => this.get('products/statistics', filters || {}, Object);
    getRootGroups = () => this.aget('products/root-groups', {}, ProductGroup);
    getSplit = (id: number) => this.aget<ProductSplitItem>(`products/${id}/split`);
}
