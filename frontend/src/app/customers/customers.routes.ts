import { Routes } from '@angular/router';
import { CustomerDetailGuard } from './customers.details.guard';

export const CUSTOMERS_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./-/customers-nav.component').then((m) => m.CustomersNavComponent),
        children: [
            {
                path: '',
                loadComponent: () => import('./-/customers-dashboard/customers-dashboard.component').then((m) => m.CustomersDashboardComponent),
                data: {
                    nav: {
                        title: $localize`:@@i18n.common.dashboard:dashboard`,
                    },
                },
            },
            {
                path: 'knownseq',
                loadComponent: () => import('./-/customers-known-sequitur-search/customers-known-sequitur-search.component').then((m) => m.CustomersKnownSequiturSearchComponent),
                data: {
                    nav: {
                        title: 'KnownSeq',
                        roles: 'user',
                    },
                },
            },
            {
                path: 'knownseq/draft/:number',
                loadComponent: () => import('./-/customers-known-sequitur/knownseq-draft.component').then((m) => m.KnownSequiturDraftComponent),
            },
            {
                path: 'knownseq/:id',
                loadComponent: () => import('./-/customers-known-sequitur-search/customers-known-sequitur-search.component').then((m) => m.CustomersKnownSequiturSearchComponent),
            },
            {
                path: 'map',
                loadComponent: () => import('./-/customers-map/customers-map.component').then((m) => m.CustomersMapComponent),
                data: {
                    nav: {
                        title: 'Map',
                        roles: 'user',
                    },
                },
            },
            {
                path: 'network',
                loadComponent: () => import('./-/customers-network/customers-network.component').then((m) => m.CustomersNetworkComponent),
                data: {
                    nav: {
                        title: 'Network',
                        roles: 'user',
                    },
                },
            },
            {
                path: 'stats',
                loadComponent: () => import('./-/customers-statistics/customers-statistics.component').then((m) => m.CustomersStatisticsComponent),
                data: {
                    nav: {
                        title: $localize`:@@i18n.common.statistics:statistics`,
                        roles: 'financial',
                    },
                },
            },
            {
                path: 'maintenance',
                loadComponent: () => import('./-/customers-maintenance/customers-maintenance.component').then((m) => m.CustomersMaintenanceComponent),
                data: {
                    nav: {
                        title: 'maintenance',
                        roles: 'admin',
                        exact: false,
                    },
                },
                children: [
                    {
                        path: 'commercial_register',
                        loadComponent: () => import('./-/customers-maintenance/customers-maintenance-commercial-register/customers-maintenance-commercial-register.component').then((m) => m.CustomersMaintenanceCommercialRegisterComponent),
                    },
                    {
                        path: 'birthdays',
                        loadComponent: () => import('./-/customers-maintenance/customers-maintenance-birthdays/customers-maintenance-birthdays.component').then((m) => m.CustomersMaintenanceBirthdaysComponent),
                    },
                    { path: '**', redirectTo: 'commercial_register' },
                ],
            },
        ],
    },
    {
        path: ':id',
        loadComponent: () => import('./details/customer-nav.component').then((m) => m.CustomerNavComponent),
        ...CustomerDetailGuard.routeActivators(),
        children: [
            {
                path: '',
                loadComponent: () => import('./details/customer-dashboard/customer-dashboard').then((m) => m.CustomerDashboard),
                data: {
                    nav: {
                        title: $localize`:@@i18n.common.dashboard:dashboard`,
                    },
                },
            },
            {
                path: 'billing',
                loadComponent: () => import('./details/customer-billing/customer-billing.component').then((m) => m.CustomerBillingComponent),
                data: {
                    nav: {
                        title: $localize`:@@i18n.common.billing:billing`,
                        roles: 'invoicing',
                    },
                },
            },
            {
                path: 'support',
                loadComponent: () => import('./details/customer-support/customer-support-container.component').then((m) => m.CustomerSupportContainerComponent),
                data: {
                    nav: {
                        title: $localize`:@@i18n.common.support:support`,
                        roles: 'invoicing|project_manager',
                    },
                },
            },
            {
                path: 'time-tracking',
                loadComponent: () => import('@app/projects/id/timetracking/timetracking-company.component').then((m) => m.TimetrackingCompanyComponent),
                data: {
                    nav: {
                        title: $localize`:@@i18n.common.timeTracking:time tracking`,
                    },
                },
            },
            {
                path: 'projects',
                loadComponent: () => import('./details/customer-projects/customer-projects').then((m) => m.CustomerProjects),
                data: {
                    nav: {
                        title: $localize`:@@i18n.common.projects:projects`,
                        roles: 'user',
                    },
                },
            },
            {
                path: 'invoices',
                loadComponent: () => import('@shards/empty-component/empty-component.component').then((m) => m.EmptyComponentComponent),
                data: {
                    nav: {
                        title: $localize`:@@i18n.common.invoices:invoices`,
                        roles: 'invoicing',
                    },
                },
                children: [
                    { path: '', pathMatch: 'full', redirectTo: 'prepare' },
                    {
                        path: 'prepare',
                        loadComponent: () => import('./details/customer-invoices/customer-invoices.component').then((m) => m.CustomerInvoicesComponent),
                        data: {
                            nav: {
                                title: $localize`:@@i18n.common.invoices:invoices`,
                                roles: 'invoicing',
                            },
                        },
                    },
                    {
                        path: 'standing-orders',
                        loadComponent: () => import('./details/customer-standing-orders/customer-standing-orders.component').then((m) => m.CustomerStandingOrdersComponent),
                        data: {
                            nav: {
                                title: $localize`:@@i18n.common.standingOrders:standing orders`,
                                roles: 'invoicing',
                            },
                        },
                    },
                ],
            },
            {
                path: 'connections',
                loadComponent: () => import('./details/customer-connections/customer-connections').then((m) => m.CustomerConnections),
                data: {
                    nav: {
                        title: $localize`:@@i18n.common.connections:connections`,
                        roles: 'user',
                    },
                },
            },
            {
                path: 'contacts',
                loadComponent: () => import('./details/customer-vcards/customer-vcards').then((m) => m.CustomerVcards),
                data: {
                    nav: {
                        title: $localize`:@@i18n.common.contacts:contacts`,
                        roles: 'user',
                    },
                },
                children: [{ path: ':cid', loadComponent: () => import('./_shards/edit-vcard.ts/edit-vcard.ts.component').then((m) => m.EditVcardTsComponent) }],
            },
            {
                path: 'knownseq',
                loadComponent: () => import('./-/customers-known-sequitur/knownseq-resolved.component').then((m) => m.KnownSequiturResolvedComponent),
                data: {
                    nav: {
                        title: 'KnownSeq',
                    },
                },
            },
            { path: 'subscriptions', loadComponent: () => import('./details/customer-subscriptions/customer-subscriptions').then((m) => m.CustomerSubscriptions) },
            { path: 'clauses', loadComponent: () => import('./details/customer-clauses/customer-clauses').then((m) => m.CustomerClauses) },
            { path: '**', redirectTo: '' },
        ],
    },
    { path: '**', redirectTo: '' },
];
