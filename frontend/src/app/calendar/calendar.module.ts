import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { subPath } from 'src/constants/subPath';
import { CalendarNavComponent } from './calendar-nav.component';
import { CalendarDetailComponent } from './calendar-detail/calendar-detail.component';
import { CalendarEntryModalComponent } from './calendar-entry-modal/calendar-entry-modal.component';

@NgModule({
    imports: [
        CalendarNavComponent,
        CalendarDetailComponent,
        CalendarEntryModalComponent,
        RouterModule.forChild([
            subPath('', CalendarNavComponent, CalendarDetailComponent, true, $localize`:@@i18n.common.calendar:calendar`),
            { path: '**', redirectTo: '' },
        ]),
    ],
}) export class CalendarModule { }
