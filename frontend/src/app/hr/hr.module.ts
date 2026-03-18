import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HrNavComponent } from './hr-nav.component';
import { HrContactComponent } from './hr-contact/hr-contact.component';
import { HrFociComponent } from './hr-foci/hr-foci.component';
import { HrVacationColsComponent } from './hr-vacation/hr-vacation-cols.component';
import { HrEmploymentComponent } from './hr-employment/hr-employment.component';
import { HrWorkloadContainerComponent } from './hr-workload/hr-workload-container-component';
import { HrDetailGuard } from './hr-details.guard';
import { NxGlobal } from '@app/nx/nx.global';
import { HrStatsComponent } from './hr-stats/hr-stats.component';
import { HrTeamComponent } from './hr-team/hr-team.component';
import { HrStatsFocusCategoriesComponent } from './hr-stats/hr-stats-focus-categories/hr-stats-focus-categories.component';
import { HrStatsWorkloadComponent } from './hr-stats/hr-stats-workload/hr-stats-workload.component';
import { HrStatsPredictionAccuracyComponent } from './hr-stats/hr-stats-prediction-accuracy/hr-stats-prediction-accuracy.component';
import { HrStatsInvoiceFocusComponent } from './hr-stats/hr-stats-invoice-focus/hr-stats-invoice-focus.component';
import { HrMilestonesComponent } from './hr-milestones/hr-milestones.component';


@NgModule({
    imports: [
        RouterModule.forChild([
            { 
                path: '',
                component: HrNavComponent,
                children: [
                    { 
                        path: 'stats', 
                        component: HrStatsComponent,
                        children: [
                            { path: 'focus-categories', component: HrStatsFocusCategoriesComponent },
                            { path: 'workload', component: HrStatsWorkloadComponent },
                            { path: 'prediction-accuracy', component: HrStatsPredictionAccuracyComponent },
                            { path: 'invoice-focus', component: HrStatsInvoiceFocusComponent },
                            { path: '', redirectTo: 'focus-categories', pathMatch: 'full' }
                        ]
                    },
                    {
                        path: ':id', 
                        ...HrDetailGuard.routeActivators(),
                        component: HrTeamComponent,
                        children: [
                            { path: 'contact', component: HrContactComponent },
                            { path: 'working_time', component: HrFociComponent },
                            { path: 'workload', component: HrWorkloadContainerComponent },
                            { path: 'vacation', component: HrVacationColsComponent },
                            { path: 'employment', component: HrEmploymentComponent },
                            { path: 'milestones', component: HrMilestonesComponent },
                            { path: '**', redirectTo: 'contact' },
                        ]
                    },
                    { path: '**', redirectTo: () => (NxGlobal.global?.user?.id ?? '') + '/contact' },
                ]
            }
        ]),
    ]
})
export class HrModule { }
