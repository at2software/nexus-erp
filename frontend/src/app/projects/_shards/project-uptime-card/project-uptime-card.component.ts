import { ChangeDetectionStrategy, Component, effect, inject, input, signal } from '@angular/core';

import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Project } from '@models/project/project.model';
import { UptimeMonitor } from '@models/uptime/uptime-monitor.model';
import { UptimeMonitorService } from '@models/uptime/uptime-monitor.service';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { ProjectComponent } from '@shards/project/project.component';
import { CollapsibleDirective } from '@directives/collapsible.directive';
import { UptimeMonitorModalService } from '@app/_modals/modal-uptime-monitor/modal-uptime-monitor.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { tracked } from '@constants/tracked';

@Component({
    selector: 'project-uptime-card',
    standalone: true,
    imports: [NgbDropdownModule, NgbTooltipModule, Nx, NComponent, AvatarComponent, ProjectComponent, CollapsibleDirective, SpinnerComponent],
    templateUrl: './project-uptime-card.component.html',
    styleUrls: ['./project-uptime-card.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectUptimeCardComponent {
    readonly projectIn = input.required<Project>({ alias: 'project' });
    readonly project = tracked(this.projectIn);

    monitors = signal<UptimeMonitor[]>([]);
    allMonitors = signal<UptimeMonitor[]>([]);
    loading = signal(true);

    #service = inject(UptimeMonitorService);
    #modalService = inject(UptimeMonitorModalService);

    constructor() {
        effect(() => this.#loadMonitors(this.projectIn()));
        this.#loadAllMonitors();
    }

    #loadMonitors(project: Project = this.projectIn()) {
        this.loading.set(true);
        this.#service.index({ project_id: project.id }).subscribe({
            next: (monitors) => {
                this.monitors.set(monitors);
                this.#setupMonitorCallbacks();
                this.loading.set(false);
            },
            error: () => this.loading.set(false),
        });
    }

    #loadAllMonitors() {
        this.#service.index().subscribe({
            next: (monitors) => this.allMonitors.set(monitors.filter((m) => !this.monitors().some((pm) => pm.id === m.id))),
        });
    }

    #setupMonitorCallbacks() {
        this.monitors().forEach((monitor) => {
            monitor.var.onTestRequested = (m: UptimeMonitor) => this.#testMonitor(m);
            monitor.var.onEditRequested = (m: UptimeMonitor) => this.#openEditModal(m);
            monitor.var.onEditSuccess = () => this.#loadMonitors();
            monitor.var.onUnlinkFromProject = (m: UptimeMonitor) => this.#unlinkMonitor(m);
        });
    }

    #openEditModal(monitor: UptimeMonitor) {
        this.#modalService.open(monitor).then(() => this.#loadMonitors()).catch(() => void 0);
    }

    #testMonitor(monitor: UptimeMonitor) {
        this.#service.testCheck(monitor).subscribe({
            next: (result) => {
                const check = result.check;
                let message = $localize`:@@i18n.uptime.testComplete:Test complete` + '\n\n';
                message += $localize`:@@i18n.common.status:status` + `: ${check.status.toUpperCase()}\n`;
                if (check.status_code) message += $localize`:@@i18n.uptime.statusCode:status code` + `: ${check.status_code}\n`;
                if (check.response_time) message += $localize`:@@i18n.uptime.responseTime:response time` + `: ${check.response_time}ms\n`;
                if (check.error_message) message += '\n' + $localize`:@@i18n.common.error:error` + `:\n${check.error_message}`;
                alert(message);
                this.#loadMonitors();
            },
            error: (err) => alert($localize`:@@i18n.uptime.testFailed:test failed` + `:\n${err?.error?.message || err?.message || 'Unknown error'}`),
        });
    }

    createNew() {
        this.#modalService.open(undefined, [this.project().id]).then(() => {
            this.#loadMonitors();
            this.#loadAllMonitors();
        }).catch(() => void 0);
    }

    linkExisting(monitor: UptimeMonitor) {
        const projectIds = [...(monitor.projects?.map((p) => p.id) || []), this.project().id];
        this.#service.update(monitor.id, { project_ids: projectIds } as any).subscribe(() => {
            this.#loadMonitors();
            this.#loadAllMonitors();
        });
    }

    #unlinkMonitor(monitor: UptimeMonitor) {
        const projectIds = (monitor.projects?.map((p) => p.id) || []).filter((id) => id !== this.project().id);
        this.#service.update(monitor.id, { project_ids: projectIds } as any).subscribe(() => {
            this.#loadMonitors();
            this.#loadAllMonitors();
        });
    }
}
