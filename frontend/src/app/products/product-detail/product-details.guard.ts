import { inject, Service } from '@angular/core';
import { DetailGuard } from '@guards/detail.guard';
import { Product } from '@models/product/product.model';
import { ProductService } from '@models/product/product.service';

@Service()
export class ProductDetailGuard extends DetailGuard<Product> {
    service = inject(ProductService);
    observable = (id: string) => this.service.show(id);
}
