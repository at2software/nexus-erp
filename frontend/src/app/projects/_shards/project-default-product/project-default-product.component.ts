import { Component, effect, inject, input } from '@angular/core';
import { NexusModule } from '@app/nx/nexus.module';
import { Product } from '@models/product/product.model';
import { ProductService } from '@models/product/product.service';
import { Project } from '@models/project/project.model';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SearchInputComponent } from '@shards/search-input/search-input.component';

@Component({
  selector: 'project-default-product',
  standalone: true,
  imports: [SearchInputComponent, NexusModule, NgbTooltipModule],
  templateUrl: './project-default-product.component.html',
  styleUrls: ['./project-default-product.component.scss']
})
export class ProjectDefaultProductComponent {
    
    project = input.required<Project>()

    product: Product | undefined = undefined
    #productService = inject(ProductService)

    constructor() {
        effect(() => {
            const project = this.project()
            if (project.product_id) {
                this.#productService.show(project.product_id).subscribe((p: Product) => {
                    this.product = p
                })
            }
        })
    }

    onProductSelect(_: Product) {
        const project = this.project()
        project.product_id = _.id
        this.product = _
        project.update().subscribe()
    }
}
