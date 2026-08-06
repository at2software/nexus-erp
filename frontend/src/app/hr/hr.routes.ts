import { Routes } from '@angular/router';
import { HrDetailGuard } from './hr-details.guard';
import { NxStatic } from '@app/nx/nx.static';

export const HR_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./hr-nav.component').then((m) => m.HrNavComponent),
        children: [
            {
                path: 'stats',
                loadComponent: () => import('./hr-stats/hr-stats.component').then((m) => m.HrStatsComponent),
                children: [
                    { path: 'focus-categories', loadComponent: () => import('./hr-stats/hr-stats-focus-categories/hr-stats-focus-categories.component').then((m) => m.HrStatsFocusCategoriesComponent) },
                    { path: 'workload', loadComponent: () => import('./hr-stats/hr-stats-workload/hr-stats-workload.component').then((m) => m.HrStatsWorkloadComponent) },
                    { path: 'prediction-accuracy', loadComponent: () => import('./hr-stats/hr-stats-prediction-accuracy/hr-stats-prediction-accuracy.component').then((m) => m.HrStatsPredictionAccuracyComponent) },
                    { path: 'invoice-focus', loadComponent: () => import('./hr-stats/hr-stats-invoice-focus/hr-stats-invoice-focus.component').then((m) => m.HrStatsInvoiceFocusComponent) },
                    { path: '', redirectTo: 'focus-categories', pathMatch: 'full' },
                ],
            },
            {
                path: ':id',
                ...HrDetailGuard.routeActivators(),
                loadComponent: () => import('./hr-team/hr-team.component').then((m) => m.HrTeamComponent),
                children: [
                    { path: 'contact', loadComponent: () => import('./hr-contact/hr-contact.component').then((m) => m.HrContactComponent) },
                    { path: 'working_time', loadComponent: () => import('./hr-foci/hr-foci.component').then((m) => m.HrFociComponent) },
                    { path: 'workload', loadComponent: () => import('./hr-workload/hr-workload-container-component').then((m) => m.HrWorkloadContainerComponent) },
                    { path: 'vacation', loadComponent: () => import('./hr-vacation/hr-vacation-cols.component').then((m) => m.HrVacationColsComponent) },
                    { path: 'employment', loadComponent: () => import('./hr-employment/hr-employment.component').then((m) => m.HrEmploymentComponent) },
                    { path: 'milestones', loadComponent: () => import('./hr-milestones/hr-milestones.component').then((m) => m.HrMilestonesComponent) },
                    { path: '**', redirectTo: 'contact' },
                ],
            },
            { path: '**', redirectTo: () => (NxStatic.global?.user?.id ?? '') + '/contact' },
        ],
    },
];
