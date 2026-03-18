import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ProfileNavComponent } from './profile-nav.component';
import { ProfilePluginsComponent } from './profile-plugins/profile-plugins.component';
import { ProfileVacationComponent } from './profile-vacation/profile-vacation.component';
import { ProfileDashboardComponent } from './profile-dashboard/profile-dashboard.component';
import { ProfileFocusComponent } from './profile-focus/profile-focus.component';
import { ProfileVacationRequestComponent } from './profile-vacation-request/profile-vacation-request.component';
import { ProfileTravelExpensesComponent } from './profile-travel-expenses/profile-travel-expenses.component';
import { ProfileSickNoteComponent } from './profile-sick-note/profile-sick-note.component';
import { ProfileSettingsComponent } from './profile-settings/profile-settings.component';
import { ProfileSentinelsComponent } from './profile-sentinels/profile-sentinels.component';
import { ProfileSentinelDetailComponent } from './profile-sentinels/profile-sentinel-detail/profile-sentinel-detail.component';
import { ProfileVcardComponent } from './profile-vcard/profile-vcard.component';
import { ProfileMilestonesComponent } from './profile-milestones/profile-milestones.component';

@NgModule({
    imports: [
        RouterModule.forChild([
            {
                path: '',
                component: ProfileNavComponent,
                title: $localize`:@@i18n.common.profile:profile`,
                children: [
                    { path: 'dashboard', component: ProfileDashboardComponent },
                    { path: 'focus', component: ProfileFocusComponent },
                    { path: 'milestones', component: ProfileMilestonesComponent },
                    { path: 'vacation', component: ProfileVacationComponent},
                    { path: 'vacation-request', component: ProfileVacationRequestComponent },
                    { path: 'travel-expenses', component: ProfileTravelExpensesComponent },
                    { path: 'connectors', component: ProfilePluginsComponent},
                    { path: 'plugins', redirectTo: 'connectors' },
                    { path: 'sick-note', component: ProfileSickNoteComponent },
                    { path: 'vcard', component: ProfileVcardComponent },
                    { path: 'settings', component: ProfileSettingsComponent },
                    { path: 'sentinels', component: ProfileSentinelsComponent, children: [
                        { path: ':id', component: ProfileSentinelDetailComponent }
                    ]},
                    { path: '**', redirectTo: 'dashboard' },
                ]
            }
        ]),
    ]
})
export class ProfileModule { }

