import { Component, inject } from '@angular/core';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { ProductGroup } from 'src/models/product/product-group.model';
import { Product } from 'src/models/product/product.model';
import { ProductGroupDetailGuard } from './product-group-detail.guard';
import { Router, RouterModule } from '@angular/router';

import { HeaderLinkItemComponent } from '@app/app/header/header-link-item/header-link-item.component';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { HeaderModule } from '@app/app/header/header.module';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'app-product-group',
    templateUrl: './product-group.component.html',
    styleUrls: ['./product-group.component.scss'],
    standalone: true,
    imports: [HeaderModule, FormsModule, HeaderLinkItemComponent, RouterModule, ToolbarComponent, HotkeyDirective]
})
export class ProductGroupComponent {

    parent = inject(ProductGroupDetailGuard)
    router = inject(Router)
    #inputModalService: InputModalService = inject(InputModalService)

    onGroupCreate = () => {
        this.#inputModalService.open("name").confirmed(({ text }) => {
            ProductGroup.createWithParentId(text, this.parent.current.id).subscribe(x => {
                this.router.navigate(['/products/group/' + x.id])
            })
        })
    }
    onProductCreate = () => {
        this.#inputModalService.open("name").confirmed(({ text }) => {
            Product.createWithParentId(text, this.parent.current.id).subscribe(x => {
                this.router.navigate(['/products/' + x.id])
            })
        })
    }

}