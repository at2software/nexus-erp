import { Component, inject, OnInit } from '@angular/core';
import { switchMap } from 'rxjs';
import { MoneyShortPipe } from 'src/pipes/mshort.pipe';
import { LoadingPipe } from 'src/pipes/loading.pipe';
import { ProductGroupService } from 'src/models/product/product-group.service';
import { Company } from 'src/models/company/company.model';
import { ProductGroupDetailGuard } from '../product-group-detail.guard';

import { AutosaveDirective } from '@directives/autosave.directive';
import { ColorPickerDirective } from 'ngx-color-picker';
import { RteComponent } from '@shards/rte/rte.component';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { NexusModule } from '@app/nx/nexus.module';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'app-product-group-overview',
    templateUrl: './product-group-overview.component.html',
    styleUrls: ['./product-group-overview.component.scss'],
    standalone: true,
    imports: [AutosaveDirective, FormsModule, ColorPickerDirective, RteComponent, AvatarComponent, NexusModule, NgbTooltipModule, MoneyShortPipe, LoadingPipe]
})
export class ProductGroupOverviewComponent implements OnInit {

    customers: Company[] = []
    totalRevenue: number | null = null
    totalCustomers = 0
    parent = inject(ProductGroupDetailGuard)
    #productGroupService = inject(ProductGroupService)

    ngOnInit() {
        this.parent.onChange.pipe(
            switchMap(group => {
                this.totalRevenue = null
                this.customers = []
                return this.#productGroupService.indexCustomers(group)
            })
        ).subscribe(data => {
            this.customers = data.customers
            this.totalRevenue = data.total_revenue
            this.totalCustomers = data.total_customers
        })
    }
}
