import { NxGlobal } from '@app/nx/nx.global';
import { ProductGroupService } from '@models/product/product-group.service';
import { Product } from './product.model';
import { Serializable } from './../serializable';
import { getProductGroupActions } from './product-group.actions';
import { Observable, map } from 'rxjs';
import { Type } from 'class-transformer';
import { Model } from '@constants/type-discriminators';
import { Dictionary } from '@constants/constants';

@Model('ProductGroup')
export class ProductGroup extends Serializable {
    SERVICE = ProductGroupService;

    doubleClickAction: number = 0;
    actions = getProductGroupActions(this);

    name: string = '';
    symbol: string = '';
    expanded: boolean = false;
    is_active: boolean = true;
    color: string = 'ffffff';
    net: number = 0;
    quote: string = '';

    @Type(()=>ProductGroup) child_groups!: ProductGroup[];
    @Type(()=>Product) products!: Product[];

    set products_min(g: any[]) {
        this.products = g.map((_) => Product.fromJson(_));
    }

    static API_PATH = (): string => 'product_groups';
    frontendUrl = (): string => `/products/group/${this.id}`;
    // patch() (not raw Object.assign) bumps Serializable#state so signal-based template
    // consumers (e.g. tracked(group) in product-tree-list) re-render under zoneless CD.
    put = (path: string) => NxGlobal.service.put(`product_groups/${this.id}/${path}`, {}).subscribe((_) => this.patch(_ as Dictionary));

    static createWithParentId = (name: string = 'New product group', parentId: string | undefined = undefined): Observable<ProductGroup> => NxGlobal.service.post('product_groups', { name: name, product_group_id: parentId }).pipe(map((x) => ProductGroup.fromJson(x)));
}
