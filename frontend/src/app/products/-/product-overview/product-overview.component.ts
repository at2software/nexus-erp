import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderComponent } from '@app/app/header/header.component';
import { HeaderLinkItemComponent } from '@app/app/header/header-link-item/header-link-item.component';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { ProductGroupService } from '@models/product/product-group.service';
import { modelListResource } from '@models/http/model-resource';

@Component({
    selector: 'product-overview',
    templateUrl: './product-overview.component.html',
    imports: [HeaderComponent, HeaderLinkItemComponent, RouterModule, HotkeyDirective, EmptyStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductOverviewComponent {
    readonly #productGroupService = inject(ProductGroupService);
    readonly #groups = modelListResource(() => this.#productGroupService.index());

    readonly hasGroups = computed(() => (this.#groups.hasValue() ? this.#groups.value().length > 0 : null));
}
