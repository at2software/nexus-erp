import { Routes } from '@angular/router';

export const PROFILE_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./profile-nav.component').then((m) => m.ProfileNavComponent),
        title: $localize`:@@i18n.common.profile:profile`,
        children: [
            { path: 'dashboard', loadComponent: () => import('./profile-dashboard/profile-dashboard.component').then((m) => m.ProfileDashboardComponent) },
            { path: 'focus', loadComponent: () => import('./profile-focus/profile-focus.component').then((m) => m.ProfileFocusComponent) },
            { path: 'milestones', loadComponent: () => import('./profile-milestones/profile-milestones.component').then((m) => m.ProfileMilestonesComponent) },
            { path: 'vacation', loadComponent: () => import('./profile-vacation/profile-vacation.component').then((m) => m.ProfileVacationComponent) },
            { path: 'vacation-request', loadComponent: () => import('./profile-vacation-request/profile-vacation-request.component').then((m) => m.ProfileVacationRequestComponent) },
            { path: 'travel-expenses', loadComponent: () => import('./profile-travel-expenses/profile-travel-expenses.component').then((m) => m.ProfileTravelExpensesComponent) },
            { path: 'connectors', loadComponent: () => import('./profile-plugins/profile-plugins.component').then((m) => m.ProfilePluginsComponent) },
            { path: 'plugins', redirectTo: 'connectors' },
            { path: 'sick-note', loadComponent: () => import('./profile-sick-note/profile-sick-note.component').then((m) => m.ProfileSickNoteComponent) },
            { path: 'vcard', loadComponent: () => import('./profile-vcard/profile-vcard.component').then((m) => m.ProfileVcardComponent) },
            { path: 'settings', loadComponent: () => import('./profile-settings/profile-settings.component').then((m) => m.ProfileSettingsComponent) },
            { path: 'sentinels', loadComponent: () => import('./profile-sentinels/profile-sentinels.component').then((m) => m.ProfileSentinelsComponent), children: [{ path: ':id', loadComponent: () => import('./profile-sentinels/profile-sentinel-detail/profile-sentinel-detail.component').then((m) => m.ProfileSentinelDetailComponent) }] },
            { path: '**', redirectTo: 'dashboard' },
        ],
    },
];
