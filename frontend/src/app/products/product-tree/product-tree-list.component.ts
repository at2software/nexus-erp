
import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs/operators';
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
export class ProductTreeListComponent {

    group = input.required<ProductGroup>()
    showDeprecated = input<boolean>(true)
    depth = input<number>(0)

    readonly #router = inject(Router)
    readonly global = inject(GlobalService)
    readonly productGroupService = inject(ProductGroupService)

    readonly #routerUrl = toSignal(
        this.#router.events.pipe(map(() => this.#router.url), startWith(this.#router.url)),
        { initialValue: this.#router.url }
    )

    expanded = signal(false)

    readonly isCurrentGroup = computed(() =>
        this.#routerUrl().includes(`/products/group/${this.group()?.id}`)
    )

    constructor() {
        effect(() => this.expanded.set(this.#shouldAutoExpand()))
    }

    #shouldAutoExpand(): boolean {
        const url = this.#routerUrl()
        const group = this.group()
        return url.includes(`/products/group/${group?.id}`) ||
               group?.products?.some(p => url.includes(`/products/${p.id}`)) ||
               group?.child_groups?.some(g => this.#groupContainsActiveItem(g, url))
    }

    #groupContainsActiveItem(group: ProductGroup, url: string): boolean {
        return url.includes(`/products/group/${group?.id}`) ||
               group?.products?.some(p => url.includes(`/products/${p.id}`)) ||
               group?.child_groups?.some(g => this.#groupContainsActiveItem(g, url))
    }

    isCurrentProduct(productId: string | number): boolean {
        return this.#routerUrl().includes(`/products/${productId}`)
    }

    hasRecurrence(product: Product): boolean {
        return !!(product.recurrence && product.recurrence > 0)
    }

    expand(event: Event): void {
        event.stopPropagation()
        this.expanded.update(v => !v)
    }
}
