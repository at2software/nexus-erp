import { inject, Injectable } from "@angular/core";
import { DetailGuard } from "src/guards/detail.guard";
import { ProductGroup } from "src/models/product/product-group.model";
import { ProductGroupService } from "src/models/product/product-group.service";

@Injectable({ providedIn: 'root' })
export class ProductGroupDetailGuard extends DetailGuard<ProductGroup> {
    service = inject(ProductGroupService)
    observable = (id: string) => this.service.show(id)
}