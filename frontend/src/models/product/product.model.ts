import { NxGlobal } from '@app/nx/nx.global';
import { ProductService } from './product.service';
import { InvoiceItem } from '../invoice/invoice-item.model';
import { Serializable } from '../serializable';
import { getProductActions } from './product.actions';
import { ProductGroup } from './product-group.model';
import { Recurrence } from '@enums/recurrence.type';
import { Observable, map } from 'rxjs';
import { HasInvoiceItems } from '@interfaces/hasInvoiceItems.interface';
import { Type } from 'class-transformer';
import { Model } from '@constants/type-discriminators';

@Model('Product')
export class Product extends Serializable implements HasInvoiceItems {
    static API_PATH = (): string => 'products';
    SERVICE = ProductService;

    doubleClickAction: number = 0;
    actions = getProductActions(this);

    name: string = '';
    item_number: string = '';
    last_used_at: string = '';
    revenue: number = 0;
    net: number = 0;
    is_active: boolean = true;
    is_discountable: boolean = false;
    recurrence: Recurrence = Recurrence.None;
    time_based: number = 0;
    minimum_amount: number = 1;
    package_amount: number = 1;
    minimum_price: number = 0;
    weight: number = 1;
    size_w: number = 0;
    size_h: number = 0;
    size_d: number = 0;
    quote: string = '';

    @Type(()=>ProductGroup) rootGroup!: ProductGroup;
    @Type(()=>InvoiceItem) invoice_items!: InvoiceItem[];

    frontendUrl = (): string => `/products/${this.id}`;
    companyId = () => undefined;
    getInvoiceItem = () => (this.invoice_items.length ? this.invoice_items[0] : null);
    put = (path: string) => NxGlobal.service.put(`products/${this.id}/${path}`, {}).subscribe((_) => Object.assign(this, _));

    static createWithParentId = (name: string = 'New product', parentId: string): Observable<Product> => {
        return NxGlobal.service.post('products', { name: name, product_group_id: parentId }).pipe(map((x) => Product.fromJson(x)));
    };
}
