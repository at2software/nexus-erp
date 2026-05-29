import { ChangeDetectionStrategy, Component, computed, effect, inject, input, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { map, startWith } from 'rxjs/operators';
import { ProductGroup } from '@models/product/product-group.model';
import { Nx } from '@app/nx/nx.directive';
import { Product } from '@models/product/product.model';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { tracked } from '@constants/tracked';

@Component({
    selector: 'product-tree-list',
    templateUrl: './product-tree-list.component.html',
    styleUrls: ['./product-tree-list.component.scss'],
    host: { class: 'd-block' },
    standalone: true,
    imports: [RouterModule, Nx, NgbTooltipModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductTreeListComponent {
    readonly groupIn = input.required<ProductGroup>({ alias: 'group' });
    readonly group = tracked(this.groupIn);
    showDeprecated = input<boolean>(true);
    depth = input<number>(0);

    expanded = signal(false);
    readonly isCurrentGroup = computed(() => this.#routerUrl().includes(`/products/group/${this.group()?.id}`));

    readonly #router = inject(Router);
    readonly #routerUrl = toSignal(
        this.#router.events.pipe(
            map(() => this.#router.url),
            startWith(this.#router.url),
        ),
        { initialValue: this.#router.url },
    );

    constructor() {
        effect(() => this.expanded.set(this.#shouldAutoExpand()));
    }

    readonly expand = (event: Event) => {
        event.stopPropagation();
        this.expanded.update(v => !v);
    };

    readonly isCurrentProduct = (productId: string | number) => this.#routerUrl().includes(`/products/${productId}`);
    readonly hasRecurrence = (product: Product) => !!(product.recurrence && product.recurrence > 0);

    #shouldAutoExpand(): boolean {
        const url = this.#routerUrl();
        const group = this.group();
        return url.includes(`/products/group/${group?.id}`) || group?.products?.some(p => url.includes(`/products/${p.id}`)) || group?.child_groups?.some(g => this.#groupContainsActiveItem(g, url));
    }

    #groupContainsActiveItem(group: ProductGroup, url: string): boolean {
        return url.includes(`/products/group/${group?.id}`) || group?.products?.some(p => url.includes(`/products/${p.id}`)) || group?.child_groups?.some(g => this.#groupContainsActiveItem(g, url));
    }
}
