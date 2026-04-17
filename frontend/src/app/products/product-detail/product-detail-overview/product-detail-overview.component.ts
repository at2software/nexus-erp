import { Component, inject, OnInit } from '@angular/core';
import { switchMap } from 'rxjs';
import { MoneyShortPipe } from 'src/pipes/mshort.pipe';
import { LoadingPipe } from 'src/pipes/loading.pipe';
import { GlobalService } from 'src/models/global.service';
import { ProductService } from 'src/models/product/product.service';
import { Company } from 'src/models/company/company.model';
import { InvoiceItem } from 'src/models/invoice/invoice-item.model';
import { ProductDetailGuard } from '../product-details.guard';

import { NgClass } from '@angular/common';
import { AutosaveDirective } from '@directives/autosave.directive';
import { RteComponent } from '@shards/rte/rte.component';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { NexusModule } from '@app/nx/nexus.module';
import { AffixInputDirective } from '@directives/affix-input.directive';
import { FormsModule } from '@angular/forms';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { UlCompactComponent } from "@shards/ul-compact/ul-compact.component";

@Component({
    selector: 'app-product-detail-overview',
    templateUrl: './product-detail-overview.component.html',
    styleUrls: ['./product-detail-overview.component.scss'],
    standalone: true,
    imports: [NgClass, AutosaveDirective, FormsModule, RteComponent, AvatarComponent, NexusModule, AffixInputDirective, NgbDropdownModule, NgbTooltipModule, MoneyShortPipe, LoadingPipe, UlCompactComponent]
})
export class ProductDetailOverviewComponent implements OnInit {

    customers: Company[] = []
    totalRevenue: number | null = null
    totalCustomers = 0
    parent = inject(ProductDetailGuard)
    global = inject(GlobalService)
    #productService = inject(ProductService)

    item? :InvoiceItem;

    ngOnInit() {
        this.item = this.parent.current.getInvoiceItem()?.getClone();
        this.parent.onChange.pipe(
            switchMap(product => {
                this.totalRevenue = null
                this.customers = []
                this.item = product.getInvoiceItem()?.getClone()
                return this.#productService.indexCustomers(product)
            })
        ).subscribe(data => {
            this.customers = data.customers
            this.totalRevenue = data.total_revenue
            this.totalCustomers = data.total_customers
        })
    }

    setTimeBased = (_: number) => this.parent.current.update({ 'time_based': _ }).subscribe()
    setItemType = (type: number) => { this.item!.type = type; this.item!.update({ type }).subscribe() }

    getCurrentPriceSourceText = (): string => {
        switch (this.parent.current.time_based) {
            case 0: return $localize`:@@i18n.common.individualInvoiceItem:individual invoice item`
            case 1: return $localize`:@@i18n.common.hourly:hourly`
            case 8: return $localize`:@@i18n.common.daily:daily`
            default: return ''
        }
    }
}
