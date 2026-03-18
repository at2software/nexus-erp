import { Component, inject, Input, OnChanges } from '@angular/core';
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
  styleUrl: './project-default-product.component.scss'
})
export class ProjectDefaultProductComponent implements OnChanges {
    
    @Input() project:Project

    product: Product | undefined = undefined
    #productService = inject(ProductService)

    ngOnChanges(changes:any) {
        if ('project' in changes) {
            if (this.project.product_id) {
                this.#productService.show(this.project.product_id).subscribe((p: Product) => {
                    this.product = p
                })
            }
        }
    }

    onProductSelect(_: Product) {
        this.project.product_id = _.id
        this.product = _
        this.project.update().subscribe()
    }
}
