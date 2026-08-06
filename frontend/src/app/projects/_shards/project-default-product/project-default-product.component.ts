import { ChangeDetectionStrategy, Component, inject, input, linkedSignal } from '@angular/core';
import { modelResource } from '@models/http/model-resource';
import { NComponent } from '@shards/n/n.component';
import { Product } from '@models/product/product.model';
import { Serializable } from '@models/_core/serializable';
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

    #productService = inject(ProductService);

    readonly #product = modelResource(
        () => this.project().product_id || undefined,
        (productId) => this.#productService.show(productId),
    );
    readonly product = linkedSignal(this.#product.value);

    onProductSelect(selected: Serializable) {
        const product = selected.assert(Product);
        if (!product) return;
        const project = this.project();
        project.product_id = product.id;
        this.product.set(product);
        project.update().subscribe();
    }
}
