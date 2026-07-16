import { Routes } from '@angular/router';

export const CALENDAR_ROUTES: Routes = [
    {
        path: '',
        loadComponent: () => import('./calendar-nav.component').then((m) => m.CalendarNavComponent),
        data: { isRoot: true },
        children: [{ path: '', loadComponent: () => import('./calendar-detail/calendar-detail.component').then((m) => m.CalendarDetailComponent), title: $localize`:@@i18n.common.calendar:calendar` }],
    },
    { path: '**', redirectTo: '' },
];
