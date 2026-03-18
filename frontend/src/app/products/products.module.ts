import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ProductDetailComponent } from './product-detail/product-detail.component';
import { ProductGroupComponent } from './product-group/product-group.component';
import { ProductNavComponent } from './product-nav.component';
import { ProductDetailOverviewComponent } from './product-detail/product-detail-overview/product-detail-overview.component';
import { ProductRefactorComponent } from './product-detail/product-split/product-split.component';
import { ProductGroupOverviewComponent } from './product-group/product-group-overview/product-group-overview.component';
import { ProductOverviewComponent } from './-/product-overview/product-overview.component';
import { ProductStatisticsComponent } from './-/product-statistics/product-statistics.component';
import { ProductGroupDetailGuard } from './product-group/product-group-detail.guard';
import { ProductDetailGuard } from './product-detail/product-details.guard';
import { subPath } from 'src/constants/subPath';

@NgModule({
    imports: [
        RouterModule.forChild([
            subPath('stats', ProductOverviewComponent, ProductStatisticsComponent, true, $localize`:@@i18n.common.statistics:statistics`),
            {
                path: '', component: ProductNavComponent, children: [
                    {
                        path: 'dashboard', 
                        component: ProductOverviewComponent, 
                        title: $localize`:@@i18n.common.products:products`,
                    },
                    {
                        path: 'group/:id',
                        ...ProductGroupDetailGuard.routeActivators(),
                        component: ProductGroupComponent, 
                        children: [
                            { path: '', component: ProductGroupOverviewComponent }
                        ]
                    },
                    {
                        path: ':id', 
                        ...ProductDetailGuard.routeActivators(),
                        component: ProductDetailComponent, 
                        children: [
                            { path: '', component: ProductDetailOverviewComponent },
                            { path: 'refactor', component: ProductRefactorComponent }
                        ]
                    },
                    { path: '**', redirectTo: 'dashboard' },
                ]
            },
            { path: '**', redirectTo: 'dashboard' },
        ]),
    ],
})
export class ProductsModule { }
