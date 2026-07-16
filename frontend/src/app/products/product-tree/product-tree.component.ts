import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ProductGroup } from '@models/product/product-group.model';
import { NotificationCenter } from '@models/notification.service';
import { ProductGroupService } from '@models/product/product-group.service';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { ProductTreeListComponent } from './product-tree-list.component';
import { Router } from '@angular/router';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';

@Component({
    selector: 'product-tree',
    templateUrl: './product-tree.component.html',
    styleUrls: ['./product-tree.component.scss'],
    host: { class: 'sticky-side sticky-side-100 card' },
    imports: [ScrollbarComponent, ProductTreeListComponent, NgbTooltipModule, SpinnerComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductTreeComponent {
    readonly groups = signal<ProductGroup[]>([]);
    readonly isLoading = signal(false);
    readonly showDeprecated = signal(false);

    readonly #productGroupService = inject(ProductGroupService);
    readonly #inputModalService = inject(InputModalService);
    readonly #router = inject(Router);

    constructor() {
        this.#update();
        NotificationCenter.subscribe(['put', 'post', 'delete'], [/^products/, /^product_groups/], () => this.#update());
    }

    readonly toggleDeprecated = () => this.showDeprecated.update(v => !v);

    readonly onGroupCreate = () => {
        this.#inputModalService.open('name').confirmed(({ text }) => {
            ProductGroup.createWithParentId(text).subscribe(x => {
                this.#router.navigate(['/products/group/' + x.id]);
            });
        });
    };

    readonly #update = () => {
        this.isLoading.set(true);
        this.#productGroupService.index().subscribe(groups => {
            this.groups.set(groups);
            this.isLoading.set(false);
        });
    };
}
