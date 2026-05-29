import { NgModule } from "@angular/core";
import { RouterModule } from "@angular/router";
import { Project } from "@models/project/project.model";
import { ProjectsAuditComponent } from "./-/projects-audit/projects-audit.component";
import { ProjectsDashboardComponent } from "./-/projects-dashboard/projects-dashboard.component";
import { ProjectsDebriefingComponent } from "./-/projects-debriefing/projects-debriefing.component";
import { ProjectsFrameworksComponent } from "./-/projects-frameworks/projects-frameworks.component";
import { ProjectsMilestonesOverviewComponent } from "./-/projects-milestones/projects-milestones.component";
import { ProjectsNavComponent } from "./-/projects-nav.component";
import { ProjectsReportingComponent } from "./-/projects-reporting/projects-reporting.component";
import { ProjectsStatsComponent } from "./-/projects-stats/projects-stats.component";
import { ProjectsUptimeComponent } from "./-/projects-uptime/projects-uptime.component";
import { ProjectDashboardComponent } from "./id/project-dashboard/project-dashboard.component";
import { ProjectDebriefingComponent } from "./id/project-debriefing/project-debriefing.component";
import { ProjectDetailComponent } from "./id/project-detail.component";
import { ProjectInvoicingComponent } from "./id/project-invoicing/project-invoicing.component";
import { ProjectMediaComponent } from "./id/project-media/project-media.component";
import { ProjectMilestonesComponent } from "./id/project-milestones/project-milestones.component";
import { ProjectPlanningComponent } from "./id/project-planning/project-planning.component";
import { ProjectSupportContainerComponent } from "./id/project-support/project-support-container.component";
import { ProjectDetailQuoteComponent } from "./id/quote/project-detail-quote.component";
import { ProjectDetailSettingsGeneralComponent } from "./id/settings/project-detail-settings-general/project-detail-settings-general.component";
import { ProjectDetailSettingsParticipantsComponent } from "./id/settings/project-detail-settings-participants/project-detail-settings-participants.component";
import { ProjectDetailSettingsPluginLinksComponent } from "./id/settings/project-detail-settings-plugin-links/project-detail-settings-plugin-links.component";
import { ProjectDetailSettingsComponent } from "./id/settings/project-detail-settings.component";
import { ProjectDetailTasksComponent } from "./id/tasks/project-detail-tasks.component";
import { TimetrackingProjectComponent } from "./id/timetracking/timetracking-project.component";
import { ProjectDetailGuard } from "./project-details.guard";


@NgModule({
    imports: [
        RouterModule.forChild([
            {
                path: '',
                component: ProjectsNavComponent,
                children: [
                    { path: '', component: ProjectsDashboardComponent, data: { nav: { title: $localize`:@@i18n.common.projects:projects` } } },
                    { path: 'stats', component: ProjectsStatsComponent },
                    { path: 'reporting', component: ProjectsReportingComponent, data: { nav: { title: $localize`:@@i18n.projects.reporting:reporting`, roles: 'invoicing' } } },
                    { path: 'milestones', component: ProjectsMilestonesOverviewComponent, data: { nav: { title: $localize`:@@i18n.common.milestones:milestones` } } },
                    { path: 'debriefing', component: ProjectsDebriefingComponent, data: { nav: { title: $localize`:@@i18n.debrief.title:debriefing` } } },
                    {
                        path: 'monitoring',
                        data: { nav: { title: $localize`:@@i18n.projects.monitoring:monitoring`, exact: false } },
                        children: [
                            { path: '', pathMatch: 'full', redirectTo: 'frameworks' },
                            { path: 'frameworks', component: ProjectsFrameworksComponent, data: { nav: { title: $localize`:@@i18n.projects.frameworks:frameworks` } } },
                            { path: 'uptime', component: ProjectsUptimeComponent, data: { nav: { title: $localize`:@@i18n.uptime.uptimeMonitoring:uptime monitoring` } } },
                            { path: 'audit', component: ProjectsAuditComponent, data: { nav: { title: $localize`:@@i18n.projects.audit:audit` } } },
                        ],
                    },
                ],
            },
            {
                path: ':id',
                component: ProjectDetailComponent,
                ...ProjectDetailGuard.routeActivators(),
                children: [
                    {
                        path: '',
                        component: ProjectDashboardComponent,
                        data: {
                            nav: {
                                title: $localize`:@@i18n.common.dashboard:dashboard`,
                            },
                        },
                    },
                    {
                        path: 'support',
                        component: ProjectSupportContainerComponent,
                        data: {
                            nav: {
                                title: $localize`:@@i18n.common.support:support`,
                                roles: 'financial|project_manager|invoicing',
                                visibleWhen: (project: Project) => project?.is_time_based,
                            },
                        },
                    },
                    {
                        path: 'invoicing',
                        data: {
                            nav: {
                                title: $localize`:@@i18n.common.invoicing:invoicing`,
                                roles: 'financial|project_manager|invoicing',
                                exact: false,
                            },
                        },
                        children: [
                            { path: '', pathMatch: 'full', redirectTo: 'quote' },
                            {
                                path: 'quote',
                                component: ProjectInvoicingComponent,
                                data: {
                                    nav: {
                                        title: $localize`:@@i18n.invoicing.quote:quote`,
                                    },
                                },
                            },
                            {
                                path: 'downpayment',
                                component: ProjectInvoicingComponent,
                                data: {
                                    nav: {
                                        title: $localize`:@@i18n.invoicing.downPayment:down payment`,
                                    },
                                },
                            },
                            {
                                path: 'support',
                                component: ProjectInvoicingComponent,
                                data: {
                                    nav: {
                                        title: $localize`:@@i18n.invoicing.support:support`,
                                    },
                                },
                            },
                            {
                                path: 'final',
                                component: ProjectInvoicingComponent,
                                data: {
                                    nav: {
                                        title: $localize`:@@i18n.invoicing.final:final invoice`,
                                    },
                                },
                            },
                        ],
                    },
                    {
                        path: 'time-tracking',
                        component: TimetrackingProjectComponent,
                        data: {
                            nav: {
                                title: $localize`:@@i18n.common.timeTracking:time tracking`,
                            },
                        },
                    },
                    {
                        path: 'milestones',
                        component: ProjectMilestonesComponent,
                        data: {
                            nav: {
                                title: $localize`:@@i18n.common.milestones:milestones`,
                            },
                        },
                    },
                    {
                        path: 'tasks',
                        component: ProjectDetailTasksComponent,
                        data: {
                            nav: {
                                title: $localize`:@@i18n.common.tasks:tasks`,
                            },
                        },
                    },
                    {
                        path: 'budget',
                        component: ProjectPlanningComponent,
                        data: {
                            target: 'qty',
                            nav: {
                                title: $localize`:@@i18n.common.budget:budget`,
                                visibleWhen: (project: Project) => !project?.is_time_based && !project?.state?.isPrepared(),
                            },
                        },
                    },
                    {
                        path: 'debriefing',
                        component: ProjectDebriefingComponent,
                        data: {
                            nav: {
                                title: $localize`:@@i18n.debrief.title:debriefing`,
                                visibleWhen: (project: Project) => project?.state.isFinishedAny(),
                            },
                        },
                    },
                    {
                        path: 'settings',
                        component: ProjectDetailSettingsComponent,
                        data: {
                            nav: {
                                title: $localize`:@@i18n.common.settings:settings`,
                                roles: 'admin',
                                exact: false,
                            },
                        },
                        children: [
                            {
                                path: 'general',
                                component: ProjectDetailSettingsGeneralComponent,
                                data: {
                                    nav: {
                                        title: $localize`:@@i18n.settings.general:general`,
                                    },
                                },
                            },
                            {
                                path: 'participants',
                                component: ProjectDetailSettingsParticipantsComponent,
                                data: {
                                    nav: {
                                        title: $localize`:@@i18n.settings.participants:participants`,
                                    },
                                },
                            },
                            {
                                path: 'plugin-links',
                                component: ProjectDetailSettingsPluginLinksComponent,
                                data: {
                                    nav: {
                                        title: $localize`:@@i18n.settings.pluginLinks:plugin links`,
                                    },
                                },
                            },
                            { path: '**', redirectTo: 'general' },
                        ],
                    },
                    {
                        path: 'planning',
                        component: ProjectPlanningComponent,
                        data: { target: 'my_prediction' },
                    },
                    {
                        path: 'quote',
                        component: ProjectDetailQuoteComponent,
                    },
                    {
                        path: 'media',
                        component: ProjectMediaComponent,
                    },
                    {
                        path: '**',
                        redirectTo: '',
                    },
                ],
            },
            { path: '**', redirectTo: '' },
        ]),
    ],
})
export class ProjectsModule {}
