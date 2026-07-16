import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { tracked } from '@constants/tracked';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { ProductGroup } from '@models/product/product-group.model';
import { Product } from '@models/product/product.model';
import { ProductGroupDetailGuard } from './product-group-detail.guard';
import { Router, RouterModule } from '@angular/router';
import { HeaderLinkItemComponent } from '@app/app/header/header-link-item/header-link-item.component';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { HeaderComponent } from '@app/app/header/header.component';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-product-group',
    templateUrl: './product-group.component.html',
    imports: [HeaderComponent, HeaderLinkItemComponent, FormsModule, RouterModule, ToolbarComponent, HotkeyDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductGroupComponent {
    readonly parent = inject(ProductGroupDetailGuard);
 readonly object = tracked(this.parent.object);

    readonly #router = inject(Router);
    readonly #inputModalService = inject(InputModalService);

    readonly onGroupCreate = () => {
        this.#inputModalService.open('name').confirmed(({ text }) => {
            ProductGroup.createWithParentId(text, this.parent.object().id).subscribe(x => {
                this.#router.navigate(['/products/group/' + x.id]);
            });
        });
    };

    readonly onProductCreate = () => {
        this.#inputModalService.open('name').confirmed(({ text }) => {
            Product.createWithParentId(text, this.parent.object().id).subscribe(x => {
                this.#router.navigate(['/products/' + x.id]);
            });
        });
    };
}
