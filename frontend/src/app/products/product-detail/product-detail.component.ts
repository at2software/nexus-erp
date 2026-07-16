import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { tracked } from '@constants/tracked';
import { ProductDetailGuard } from './product-details.guard';
import { HeaderLinkItemComponent } from '@app/app/header/header-link-item/header-link-item.component';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '@app/app/header/header.component';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    selector: 'app-product-detail',
    templateUrl: './product-detail.component.html',
    imports: [HeaderComponent, HeaderLinkItemComponent, RouterModule, HotkeyDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailComponent {
    parent = inject(ProductDetailGuard);

    readonly object = tracked(this.parent.object);
}
