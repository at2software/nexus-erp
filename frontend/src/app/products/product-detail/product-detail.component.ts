import { Component, inject } from '@angular/core';
import { ProductDetailGuard } from './product-details.guard';
import { HeaderLinkItemComponent } from '@app/app/header/header-link-item/header-link-item.component';
import { RouterModule } from '@angular/router';

import { HeaderModule } from '@app/app/header/header.module';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    selector: 'app-product-detail',
    templateUrl: './product-detail.component.html',
    styleUrls: ['./product-detail.component.scss'],
    standalone: true,
    imports: [HeaderModule, HeaderLinkItemComponent, RouterModule, HotkeyDirective]
})
export class ProductDetailComponent {
    parent = inject(ProductDetailGuard)
}
