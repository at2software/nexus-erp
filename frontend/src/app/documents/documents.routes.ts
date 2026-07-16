import { Routes } from '@angular/router';

export const DOCUMENTS_ROUTES: Routes = [
    { path: '', loadComponent: () => import('./document-dashboard/document-dashboard.component').then((m) => m.DocumentDashboardComponent) },
];
