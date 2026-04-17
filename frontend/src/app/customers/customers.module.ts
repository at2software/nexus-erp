import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CustomersDashboardComponent } from './-/customers-dashboard/customers-dashboard.component';
import { CustomerNavComponent } from './details/customer-nav.component';
import { CustomerDashboard } from './details/customer-dashboard/customer-dashboard';
import { CustomerProjects } from './details/customer-projects/customer-projects';
import { CustomerSupportContainerComponent } from './details/customer-support/customer-support-container.component';
import { CustomerBillingComponent } from './details/customer-billing/customer-billing.component';
import { CustomerInvoicesComponent } from './details/customer-invoices/customer-invoices.component';
import { CustomerSubscriptions } from './details/customer-subscriptions/customer-subscriptions';
import { CustomerClauses } from './details/customer-clauses/customer-clauses';
import { CustomerConnections } from './details/customer-connections/customer-connections';
import { CustomersNavComponent } from './-/customers-nav.component';
import { CustomersStatisticsComponent } from './-/customers-statistics/customers-statistics.component';
import { CustomersKnownSequiturSearchComponent } from './-/customers-known-sequitur-search/customers-known-sequitur-search.component';
import { CustomersKnownSequiturComponent } from './-/customers-known-sequitur/customers-known-sequitur.component';
import { CustomerStandingOrdersComponent } from './details/customer-standing-orders/customer-standing-orders.component';
import { CustomersMaintenanceComponent } from './-/customers-maintenance/customers-maintenance.component';
import { CustomersMaintenanceCommercialRegisterComponent } from './-/customers-maintenance/customers-maintenance-commercial-register/customers-maintenance-commercial-register.component';
import { CustomersMaintenanceBirthdaysComponent } from './-/customers-maintenance/customers-maintenance-birthdays/customers-maintenance-birthdays.component';
import { CustomerDetailGuard } from './customers.details.guard';
import { TimetrackingCompanyComponent } from '@app/projects/id/timetracking/timetracking-company.component';
import { CustomersMapComponent } from './-/customers-map/customers-map.component';
import { CustomersNetworkComponent } from './-/customers-network/customers-network.component';
import { CustomerVcards } from './details/customer-vcards/customer-vcards';
import { EditVcardTsComponent } from './_shards/edit-vcard.ts/edit-vcard.ts.component';
import { EmptyComponentComponent } from '@shards/empty-component/empty-component.component';


@NgModule({
    imports: [
        RouterModule.forChild([
            {
                path: '',
                component: CustomersNavComponent,
                children: [
                    {
                        path: '',
                        component: CustomersDashboardComponent,
                        data: {
                            nav: {
                                title: $localize`:@@i18n.common.dashboard:dashboard`
                            }
                        }
                    },
                    {
                        path: 'knownseq',
                        component: CustomersKnownSequiturSearchComponent,
                        data: {
                            nav: {
                                title: 'KnownSeq',
                                roles: 'user'
                            }
                        }
                    },
                    {
                        path: 'knownseq/:id',
                        component: CustomersKnownSequiturSearchComponent
                    },
                    {
                        path: 'map',
                        component: CustomersMapComponent,
                        data: {
                            nav: {
                                title: 'Map',
                                roles: 'user'
                            }
                        }
                    },
                    {
                        path: 'network',
                        component: CustomersNetworkComponent,
                        data: {
                            nav: {
                                title: 'Network',
                                roles: 'user'
                            }
                        }
                    },
                    {
                        path: 'stats',
                        component: CustomersStatisticsComponent,
                        data: {
                            nav: {
                                title: $localize`:@@i18n.common.statistics:statistics`,
                                roles: 'financial'
                            }
                        }
                    },
                    {
                        path: 'maintenance',
                        component: CustomersMaintenanceComponent,
                        data: {
                            nav: {
                                title: 'maintenance',
                                roles: 'admin',
                                exact: false
                            }
                        },
                        children: [
                            {
                                path: 'commercial_register',
                                component: CustomersMaintenanceCommercialRegisterComponent
                            },
                            {
                                path: 'birthdays',
                                component: CustomersMaintenanceBirthdaysComponent
                            },
                            { path: '**', redirectTo: 'commercial_register' },
                        ]
                    },
                ]
            },
            {
                path: ':id',
                component: CustomerNavComponent,
                ...CustomerDetailGuard.routeActivators(),
                children: [
                    {
                        path: '',
                        component: CustomerDashboard,
                        data: {
                            nav: {
                                title: $localize`:@@i18n.common.dashboard:dashboard`
                            }
                        }
                    },
                    {
                        path: 'billing',
                        component: CustomerBillingComponent,
                        data: {
                            nav: {
                                title: $localize`:@@i18n.common.billing:billing`,
                                roles: 'invoicing'
                            }
                        }
                    },
                    {
                        path: 'support',
                        component: CustomerSupportContainerComponent,
                        data: {
                            nav: {
                                title: $localize`:@@i18n.common.support:support`,
                                roles: 'invoicing|project_manager'
                            }
                        }
                    },
                    {
                        path: 'time-tracking',
                        component: TimetrackingCompanyComponent,
                        data: {
                            nav: {
                                title: $localize`:@@i18n.common.timeTracking:time tracking`
                            }
                        }
                    },
                    {
                        path: 'projects',
                        component: CustomerProjects,
                        data: {
                            nav: {
                                title: $localize`:@@i18n.common.projects:projects`,
                                roles: 'user'
                            }
                        }
                    },
                    {
                        path: 'invoices',
                        component: EmptyComponentComponent,
                        data: {
                            nav: {
                                title: $localize`:@@i18n.common.invoices:invoices`,
                                roles: 'invoicing'
                            }
                        },
                        children: [      
                            { path: '', pathMatch: 'full', redirectTo: 'prepare' },                                         
                            {
                                path: 'prepare',
                                component: CustomerInvoicesComponent,
                                data: {
                                    nav: {
                                        title: $localize`:@@i18n.common.invoices:invoices`,
                                        roles: 'invoicing'
                                    }
                                },
                            },
                            {
                                path: 'standing-orders',
                                component: CustomerStandingOrdersComponent,
                                data: {
                                    nav: {
                                        title: $localize`:@@i18n.common.standingOrders:standing orders`,
                                        roles: 'invoicing'
                                    }
                                }
                            },
                        ]
                    },
                    {
                        path: 'connections',
                        component: CustomerConnections,
                        data: {
                            nav: {
                                title: $localize`:@@i18n.common.connections:connections`,
                                roles: 'user'
                            }
                        }
                    },
                    {
                        path: 'contacts',
                        component: CustomerVcards,
                        data: {
                            nav: {
                                title: $localize`:@@i18n.common.contacts:contacts`,
                                roles: 'user'
                            }
                        },
                        children: [
                            { path: ':cid', component: EditVcardTsComponent }
                        ]
                    },
                    {
                        path: 'knownseq',
                        component: CustomersKnownSequiturComponent,
                        data: {
                            nav: {
                                title: 'KnownSeq'
                            }
                        }
                    },
                    { path: 'subscriptions', component: CustomerSubscriptions },
                    { path: 'clauses', component: CustomerClauses },
                    { path: '**', redirectTo: '' },
                ]
            },
            { path: '**', redirectTo: '' },
        ]),
    ],
})

export class CustomersModule { }
