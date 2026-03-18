import { inject, Injectable } from "@angular/core";
import { DetailGuard } from "src/guards/detail.guard";
import { Product } from "src/models/product/product.model";
import { ProductService } from "src/models/product/product.service";

@Injectable({ providedIn: 'root' })
export class ProductDetailGuard extends DetailGuard<Product> {
    service = inject(ProductService)
    observable = (id: string) => this.service.show(id)
}