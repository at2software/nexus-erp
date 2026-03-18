
import { Component, inject, Input, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { GlobalService } from 'src/models/global.service';
import { ProductGroup } from 'src/models/product/product-group.model';
import { ProductGroupService } from 'src/models/product/product-group.service';
import { NexusModule } from '@app/nx/nexus.module';
import { Product } from 'src/models/product/product.model';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'product-tree-list',
    templateUrl: './product-tree-list.component.html',
    styleUrls: ['./product-tree-list.component.scss'],
    host: { class: 'd-block' },
    standalone: true,
    imports: [RouterModule, NexusModule, NgbTooltipModule]
})
export class ProductTreeListComponent implements OnInit {

    @Input() group: ProductGroup
    @Input() showDeprecated: boolean = true
    @Input() depth: number = 0

    expanded: boolean = false
    global = inject(GlobalService)
    productGroupService = inject(ProductGroupService)
    router = inject(Router)

    expand = (event: any) => {
        event.stopPropagation();
        this.expanded = !this.expanded
    }

    ngOnInit() {
        this.expanded = this.#shouldAutoExpand()
    }

    #shouldAutoExpand = (): boolean => {
        const url = this.router.url
        return url.includes(`/products/group/${this.group?.id}`) ||
               this.group?.products?.some(p => url.includes(`/products/${p.id}`)) ||
               this.group?.child_groups?.some(g => this.#groupContainsActiveItem(g, url))
    }

    #groupContainsActiveItem = (group: ProductGroup, url: string): boolean =>
        url.includes(`/products/group/${group?.id}`) ||
        group?.products?.some(p => url.includes(`/products/${p.id}`)) ||
        group?.child_groups?.some(g => this.#groupContainsActiveItem(g, url))

    isCurrentGroup = (): boolean => this.router.url.includes(`/products/group/${this.group?.id}`)

    isCurrentProduct = (productId: string | number): boolean => this.router.url.includes(`/products/${productId}`)

    hasRecurrence = (product: Product): boolean => !!(product.recurrence && product.recurrence > 0)

}
