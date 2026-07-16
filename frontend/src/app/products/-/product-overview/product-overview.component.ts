import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { map } from 'rxjs/operators';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '@app/app/header/header.component';
import { HeaderLinkItemComponent } from '@app/app/header/header-link-item/header-link-item.component';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { ProductGroupService } from '@models/product/product-group.service';

@Component({
    selector: 'product-overview',
    templateUrl: './product-overview.component.html',
    imports: [HeaderComponent, HeaderLinkItemComponent, RouterModule, HotkeyDirective, EmptyStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductOverviewComponent {
    readonly #productGroupService = inject(ProductGroupService);

    readonly hasGroups = signal<boolean | null>(null);

    constructor() {
        this.#productGroupService.index().pipe(map(groups => groups.length > 0)).subscribe(v => this.hasGroups.set(v));
    }
}
