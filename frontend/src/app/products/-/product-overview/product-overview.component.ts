import { Component, inject, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HeaderModule } from '@app/app/header/header.module';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { ProductGroupService } from 'src/models/product/product-group.service';

@Component({
    selector: 'product-overview',
    templateUrl: './product-overview.component.html',
    styleUrls: ['./product-overview.component.scss'],
    standalone: true,
    imports: [HeaderModule, RouterModule, HotkeyDirective, EmptyStateComponent]
})
export class ProductOverviewComponent implements OnInit {
    hasGroups: boolean | null = null

    #productGroupService = inject(ProductGroupService)

    ngOnInit() {
        this.#productGroupService.index().subscribe(groups => {
            this.hasGroups = groups.length > 0
        })
    }
}
