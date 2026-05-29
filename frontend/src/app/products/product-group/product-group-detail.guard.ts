import { inject, Injectable } from '@angular/core';
import { DetailGuard } from '@guards/detail.guard';
import { ProductGroup } from '@models/product/product-group.model';
import { ProductGroupService } from '@models/product/product-group.service';

@Injectable({ providedIn: 'root' })
export class ProductGroupDetailGuard extends DetailGuard<ProductGroup> {
    service = inject(ProductGroupService);
    observable = (id: string) => this.service.show(id);
}
