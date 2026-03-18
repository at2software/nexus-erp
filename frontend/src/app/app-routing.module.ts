import { Routes } from '@angular/router';
import { PermissionsGuard } from '@guards/permissions.guard';
import { VacationDetailsComponent } from './profile/vacation-details/vacation-details.component';
import { VacationGuardComponent } from './profile/vacation-details/vacation-guard.component';
import { LoginComponent } from './app/login/login.component';
import { Environment404Component } from './app/environment404/environment404.component';
import { AuthenticationService } from '@models/auth.service';

const moduleLoadError = (error:any) => {
    console.error('lazy load error', error)
    return Promise.reject(error)
}

export const routes = (): Routes => [
    { path: 'login', component: LoginComponent },
    { path: 'environment404', component: Environment404Component },
    {
        path: '', 
        canActivate: [AuthenticationService.getAuthGuard()], 
        children: [
            {
                title: 'Dashboard',
                path: 'dashboard',
                loadComponent: () => import('@dashboard/dashboard.component').then(m => m.DashboardComponent),
            },
            {
                title: 'Dashboard',
                path: 'dashboard/:dashboard',
                loadComponent: () => import('@dashboard/dashboard.component').then(m => m.DashboardComponent),
            },
            { 
                path: 'customers', 
                canActivate: [PermissionsGuard], 
                data: { roles: "user" }, 
                loadChildren: () => import('./customers/customers.module').then(m => m.CustomersModule).catch(err =>moduleLoadError(err))
            },
            { 
                path: 'marketing', 
                canActivate: [PermissionsGuard], 
                data: { roles: "marketing" },
                loadChildren: () => import('./marketing/marketing.module').then(m => m.MarketingModule).catch(err =>moduleLoadError(err))
            },
            { 
                path: 'hr', 
                canActivate: [PermissionsGuard], 
                data: { roles: "hr|project_manager" }, 
                loadChildren: () => import('./hr/hr.module').then(m => m.HrModule).catch(err =>moduleLoadError(err))
            },
            { 
                path: 'projects', 
                canActivate: [PermissionsGuard], 
                data: { roles: "user" }, 
                loadChildren: () => import('./projects/projects.module').then(m => m.ProjectsModule).catch(err =>moduleLoadError(err))
            },
            { 
                title: $localize`:@@i18n.common.invoices:invoices`,
                path: 'invoices', 
                canActivate: [PermissionsGuard], 
                data: { roles: "invoicing" }, 
                loadChildren: () => import('./invoices/invoices.module').then(m => m.InvoicesModule).catch(err =>moduleLoadError(err))
            },
            { 
                path: 'products', 
                canActivate: [PermissionsGuard], 
                data: { roles: "product_manager" }, 
                loadChildren: () => import('./products/products.module').then(m => m.ProductsModule).catch(err =>moduleLoadError(err))
            },
            { 
                title: $localize`:@@i18n.common.documents:documents`,
                path: 'documents', 
                loadChildren: () => import('./documents/documents.module').then(m => m.DocumentsModule).catch(err =>moduleLoadError(err))
            },
            { 
                title: $localize`:@@i18n.common.profile:profile`,
                path: 'profile', 
                loadChildren: () => import('./profile/profile.module').then(m => m.ProfileModule).catch(err =>moduleLoadError(err))
            },
            { 
                title: $localize`:@@i18n.common.settings:settings`,
                path: 'settings', 
                canActivate: [PermissionsGuard], 
                data: { roles: "admin" },
                loadChildren: () => import('./settings/settings.module').then(m => m.SettingsModule).catch(err =>moduleLoadError(err))
            },
            { 
                title: $localize`:@@i18n.common.calendar:calendar`,
                path: 'calendar', 
                canActivate: [PermissionsGuard], 
                data: { roles: "user" },
                 loadChildren: () => import('./calendar/calendar.module').then(m => m.CalendarModule).catch(err =>moduleLoadError(err))
            },
            {
                title: $localize`:@@i18n.common.vacationRequest:vacation request`,
                path: 'vacation/:id',
                component:VacationDetailsComponent,
                canActivate: [VacationGuardComponent]
            },
            { 
                path: '**', 
                redirectTo: 'dashboard' 
            },
        ].concat([])
    },
];