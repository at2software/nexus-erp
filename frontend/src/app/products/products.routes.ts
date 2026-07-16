import { Routes } from '@angular/router';
import { ProductGroupDetailGuard } from './product-group/product-group-detail.guard';
import { ProductDetailGuard } from './product-detail/product-details.guard';

export const PRODUCTS_ROUTES: Routes = [
    {
        path: 'stats',
        loadComponent: () => import('./-/product-overview/product-overview.component').then((m) => m.ProductOverviewComponent),
        data: { isRoot: true },
        children: [{ path: '', loadComponent: () => import('./-/product-statistics/product-statistics.component').then((m) => m.ProductStatisticsComponent), title: $localize`:@@i18n.common.statistics:statistics` }],
    },
    {
        path: '',
        loadComponent: () => import('./product-nav.component').then((m) => m.ProductNavComponent),
        children: [
            {
                path: 'dashboard',
                loadComponent: () => import('./-/product-overview/product-overview.component').then((m) => m.ProductOverviewComponent),
                title: $localize`:@@i18n.common.products:products`,
            },
            {
                path: 'group/:id',
                ...ProductGroupDetailGuard.routeActivators(),
                loadComponent: () => import('./product-group/product-group.component').then((m) => m.ProductGroupComponent),
                children: [{ path: '', loadComponent: () => import('./product-group/product-group-overview/product-group-overview.component').then((m) => m.ProductGroupOverviewComponent) }],
            },
            {
                path: ':id',
                ...ProductDetailGuard.routeActivators(),
                loadComponent: () => import('./product-detail/product-detail.component').then((m) => m.ProductDetailComponent),
                children: [
                    { path: '', loadComponent: () => import('./product-detail/product-detail-overview/product-detail-overview.component').then((m) => m.ProductDetailOverviewComponent) },
                    { path: 'refactor', loadComponent: () => import('./product-detail/product-split/product-split.component').then((m) => m.ProductRefactorComponent) },
                ],
            },
            { path: '**', redirectTo: 'dashboard' },
        ],
    },
    { path: '**', redirectTo: 'dashboard' },
];
