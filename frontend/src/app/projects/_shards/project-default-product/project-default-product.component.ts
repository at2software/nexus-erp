import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';
import { NComponent } from '@shards/n/n.component';
import { Product } from '@models/product/product.model';
import { Serializable } from '@models/serializable';
import { ProductService } from '@models/product/product.service';
import { Project } from '@models/project/project.model';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SearchInputComponent } from '@shards/search-input/search-input.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'project-default-product',
    imports: [SearchInputComponent, NComponent, NgbTooltipModule],
    templateUrl: './project-default-product.component.html',
})
export class ProjectDefaultProductComponent {
    project = input.required<Project>();

    product = signal<Product | undefined>(undefined);

    #productService = inject(ProductService);

    constructor() {
        effect(() => {
            const project = this.project();
            if (project.product_id) {
                this.#productService.show(project.product_id).subscribe((p: Product) => this.product.set(p));
            }
        });
    }

    onProductSelect(selected: Serializable) {
        const product = selected.assert(Product);
        if (!product) return;
        const project = this.project();
        project.product_id = product.id;
        this.product.set(product);
        project.update().subscribe();
    }
}
