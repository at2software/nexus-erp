import { ChangeDetectionStrategy, Component, computed, effect, inject, linkedSignal, signal, untracked } from '@angular/core';
import { AssignmentService } from '@models/assignee/assignment.service';
import { Project } from '@models/project/project.model';
import { Assignee } from '@models/assignee/assignee.model';
import { Company } from '@models/company/company.model';
import { CompanyContact } from '@models/company/company-contact.model';
import { NgbDate, NgbDateAdapter, NgbDatepickerModule, NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { NgbDateCarbonAdapter } from '@directives/ngb-date.adapter';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { PluginInstanceFactory } from '@models/http/plugin.instance.factory';
import { PluginInstance } from '@models/http/plugin.instance';
import { PluginLinkService } from '@models/pluginLink/plugin-link.service';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { MantisPlugin } from '@models/http/plugin.mantis';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { MantisProjectSelectionComponent } from '@app/_modals/mantis-project-selection/mantis-project-selection.component';
import { Encryption } from '@models/encryption/encryption.model';
import { Toast } from '@shards/toast/toast';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { RouterLink } from '@angular/router';
import { PermissionsDirective } from '@directives/permissions.directive';
import { CollapsibleDirective } from '@directives/collapsible.directive';
import { ListGroupItemContactComponent } from '@app/customers/_shards/list-group-item-contact/list-group-item-contact.component';
import { ProjectDefaultProductComponent } from '@app/projects/_shards/project-default-product/project-default-product.component';
import { ProjectPlanningComponent } from '@app/projects/id/project-planning/project-planning.component';
import { RteComponent } from '@shards/rte/rte.component';
import { ProjectInfoComponent } from '@app/projects/_shards/project-info/project-info.component';
import { ProjectFeaturesListComponent } from '@app/projects/_shards/project-features-list/project-features-list.component';
import { ParentProjectSelectorComponent } from '@app/projects/_shards/parent-project-selector/parent-project-selector.component';
import { ProjectTeamPlanningComponent } from '@app/projects/_shards/project-team-planning/project-team-planning.component';
import { FormsModule } from '@angular/forms';
import { AutosaveDirective } from '@directives/autosave.directive';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { MediaPreviewComponent } from '../project-media/media-preview/media-preview.component';
import { UptimeMonitor } from '@models/uptime/uptime-monitor.model';
import { UptimeMonitorService } from '@models/uptime/uptime-monitor.service';
import { UptimeMonitorModalService } from '@app/_modals/modal-uptime-monitor/modal-uptime-monitor.component';
import { WorkloadTimelineChartComponent } from '@shards/workload-timeline-chart/workload-timeline-chart.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'project-dashboard',
    templateUrl: './project-dashboard.component.html',
    styleUrls: ['./project-dashboard.component.scss'],
    providers: [{ provide: NgbDateAdapter, useClass: NgbDateCarbonAdapter }],
    imports: [DatePipe, NgTemplateOutlet, PermissionsDirective, CollapsibleDirective, ListGroupItemContactComponent, Nx, NComponent, NgbTooltipModule, ProjectDefaultProductComponent, ParentProjectSelectorComponent, ProjectPlanningComponent, RteComponent, WorkloadTimelineChartComponent, MediaPreviewComponent, ProjectInfoComponent, ProjectFeaturesListComponent, ProjectTeamPlanningComponent, NgbDatepickerModule, FormsModule, AutosaveDirective, NgbDropdownModule, RouterLink],
})
export class ProjectDashboardComponent {
    #assignmentService  = inject(AssignmentService);
    #pluginLinkService  = inject(PluginLinkService);
    #inputModalService  = inject(InputModalService);
    #modalService       = inject(ModalBaseService);
    #uptimeService      = inject(UptimeMonitorService);
    #uptimeModalService = inject(UptimeMonitorModalService);
    parent              = inject(ProjectDetailGuard);
    factory             = inject(PluginInstanceFactory);

    pluginCompact = signal(true);
    monitors      = signal<UptimeMonitor[]>([]);
    #allMonitors  = signal<UptimeMonitor[]>([]);
    /** Monitors that exist but are not yet linked to this project. */
    linkableMonitors = computed(() => {
        const linked = new Set(this.monitors().map((m) => m.id));
        return this.#allMonitors().filter((m) => !linked.has(m.id));
    });

    contacts = linkedSignal(() => this.parent.object().assignees.filter((a) => a.assignee?.class === 'CompanyContact'));

    #invoiceItemsReloadRequested = false;

    constructor() {
        effect(() => {
            const project = this.parent.object();
            if (!project) return;
            untracked(() => {
                this.#linkMilestoneProjects(project);
                this.#syncWorkshares(project);
                this.#loadMonitors(project);
            });
        });
        this.#loadAllMonitors();
    }

    #loadMonitors(project: Project) {
        this.#uptimeService.index({ project_id: project.id }).subscribe((monitors) => this.monitors.set(monitors));
    }

    #loadAllMonitors() {
        this.#uptimeService.index().subscribe((monitors) => this.#allMonitors.set(monitors));
    }

    createNewMonitor() {
        this.#uptimeModalService.open(undefined, [this.parent.object().id]).then(() => {
            this.#loadMonitors(this.parent.object());
            this.#loadAllMonitors();
        }).catch(() => void 0);
    }

    linkExistingMonitor(monitor: UptimeMonitor) {
        const projectIds = [...(monitor.projects?.map((p) => p.id) || []), this.parent.object().id];
        this.#uptimeService.update(monitor.id, { project_ids: projectIds } as any).subscribe(() => this.#loadMonitors(this.parent.object()));
    }

    #linkMilestoneProjects(project: Project) {
        if (!Array.isArray(project.invoice_items)) {
            // light payloads can lack invoice_items; reload once to fetch the full project
            if (!this.#invoiceItemsReloadRequested) {
                this.#invoiceItemsReloadRequested = true;
                setTimeout(() => this.parent.reload(), 100);
            }
            return;
        }
        project.invoice_items.forEach((item) => item.milestones?.forEach((milestone) => (milestone.project = project)));
    }

    updateDate = (field: string, date: NgbDate) => {
        const d = `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
        this.parent.object().update({ [field]: d }).subscribe();
    };

    clearDate = (field: string) => {
        this.parent.object().update({ [field]: null }).subscribe();
    };

    /** Sync var.workshares (consumed by project-info) and user.hours_invested from the timeline. */
    #syncWorkshares(project: Project) {
        project.var.workshares = (project.timeline_chart ?? []).map((entry) => {
            const val = entry.data.reduce((sum, point) => sum + (Number(point.value) || 0), 0);
            if (entry.user) entry.user.hours_invested = val;
            return { name: entry.user?.name || 'Unknown', color: entry.user?.color || '#cccccc', val };
        });
    }

    toggleTimeBased() {
        const object = this.parent.object();
        const val = object.is_time_based ? 0 : 1;
        object.update({ is_time_based: val }).subscribe(() => {
            object.is_time_based = val;
        });
    }

    onAssignmentActions = () => this.parent.reload();

    addCompanyContact(x: CompanyContact) {
        this.#assignmentService.addToProject(this.parent.object(), { id: x.id, class: 'company_contact' }).subscribe((response: Assignee) => {
            this.contacts.update((arr) => [...arr, response]);
        });
    }

    allAvailableContacts = computed(() => {
        const contactGroups: { company: Company; employees: CompanyContact[] }[] = [];
        const object = this.parent.object();
        if (object?.company?.employees) {
            contactGroups.push({
                company: object.company,
                employees: object.company.employees,
            });
        }
        object?.connection_projects?.forEach((cp) => {
            if (cp.other_company?.employees?.length > 0) {
                contactGroups.push({
                    company: cp.other_company,
                    employees: cp.other_company.employees,
                });
            }
        });
        return contactGroups;
    });

    onNewPluginLink(pluginInstance: PluginInstance) {
        if (pluginInstance instanceof MantisPlugin) {
            this.#modalService
                .open(MantisProjectSelectionComponent, pluginInstance)
                .then((response) => {
                    if (response) {
                        const object = this.parent.object();
                        this.#pluginLinkService.store(pluginInstance.toPluginLink(response), object).subscribe((_) => {
                            object.plugin_links.push(_);
                            this.parent.touch();
                        });
                    }
                })
                .catch(() => void 0);
        } else {
            this.#inputModalService
                .open(pluginInstance.newPluginText)
                .then((response) => {
                    if (response && 'text' in response) {
                        const object = this.parent.object();
                        this.#pluginLinkService.store(pluginInstance.toPluginLink(response!.text), object).subscribe((_) => {
                            object.plugin_links.push(_);
                            this.parent.touch();
                        });
                    }
                })
                .catch(() => void 0);
        }
    }

    createBlank(enc: Encryption) {
        const object = this.parent.object();
        const instance = this.factory.instanceFor(enc)!;
        const p = instance.createBlankFor!(object) as Promise<string>;
        p.then((id: string) => {
            const existing = object.plugin_links.filter((_) => this.factory.instanceFor(_)?.toPluginLink(id).url === _.url);
            if (existing.length) {
                Toast.info($localize`:@@i18n.projects.channel_already_added:Channel has already been added`);
            } else {
                this.#pluginLinkService.store(instance.toPluginLink(id), object).subscribe((_) => {
                    Toast.success($localize`:@@i18n.projects.channel_created:Channel has been created`);
                    object.plugin_links.push(_);
                    this.parent.touch();
                });
            }
        });
    }
}
