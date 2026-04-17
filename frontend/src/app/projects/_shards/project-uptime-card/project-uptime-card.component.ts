import { Component, effect, inject, input } from '@angular/core';

import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Project } from '@models/project/project.model';
import { UptimeMonitor } from '@models/uptime/uptime-monitor.model';
import { UptimeMonitorService } from '@models/uptime/uptime-monitor.service';
import { NexusModule } from '@app/nx/nexus.module';
import { CollapsibleDirective } from '@directives/collapsible.directive';
import { UptimeMonitorModalService } from '@app/_modals/modal-uptime-monitor/modal-uptime-monitor.component';

@Component({
    selector: 'project-uptime-card',
    standalone: true,
    imports: [NgbDropdownModule, NgbTooltipModule, NexusModule, CollapsibleDirective],
    templateUrl: './project-uptime-card.component.html',
    styleUrls: ['./project-uptime-card.component.scss']
})
export class ProjectUptimeCardComponent {
    project = input.required<Project>();

    monitors: UptimeMonitor[] = [];
    allMonitors: UptimeMonitor[] = [];
    loading = true;

    #service = inject(UptimeMonitorService);
    #modalService = inject(UptimeMonitorModalService);

    constructor() { 
        effect(() => this.loadMonitors(this.project()))
        this.loadAllMonitors();
    }

    loadMonitors(project: Project = this.project()) {
        this.#service.index({ project_id: project.id }).subscribe({
            next: (monitors) => {
                this.monitors = monitors;
                this.setupMonitorCallbacks();
                this.loading = false;
            },
            error: () => this.loading = false
        });
    }

    loadAllMonitors() {
        this.#service.index().subscribe({
            next: (monitors) => this.allMonitors = monitors.filter(m => !this.monitors.some(pm => pm.id === m.id))
        });
    }

    setupMonitorCallbacks() {
        this.monitors.forEach(monitor => {
            monitor.var.onTestRequested = (m: UptimeMonitor) => this.testMonitor(m);
            monitor.var.onEditRequested = (m: UptimeMonitor) => this.openEditModal(m);
            monitor.var.onEditSuccess = () => this.loadMonitors();
            monitor.var.onUnlinkFromProject = (m: UptimeMonitor) => this.unlinkMonitor(m);
        });
    }

    openEditModal(monitor: UptimeMonitor) {
        this.#modalService.open(monitor).then(() => this.loadMonitors()).catch(() => {
            // Modal dismissed
        });
    }

    testMonitor(monitor: UptimeMonitor) {
        this.#service.testCheck(monitor).subscribe({
            next: (result) => {
                const check = result.check;
                let message = $localize`:@@i18n.uptime.testComplete:Test complete` + '\n\n';
                message += $localize`:@@i18n.common.status:status` + `: ${check.status.toUpperCase()}\n`;
                if (check.status_code) message += $localize`:@@i18n.uptime.statusCode:status code` + `: ${check.status_code}\n`;
                if (check.response_time) message += $localize`:@@i18n.uptime.responseTime:response time` + `: ${check.response_time}ms\n`;
                if (check.error_message) message += '\n' + $localize`:@@i18n.common.error:error` + `:\n${check.error_message}`;
                alert(message);
                this.loadMonitors();
            },
            error: (err) => alert($localize`:@@i18n.uptime.testFailed:test failed` + `:\n${err?.error?.message || err?.message || 'Unknown error'}`)
        });
    }

    createNew() {
        this.#modalService.open(undefined, [this.project().id]).then(() => {
            this.loadMonitors();
            this.loadAllMonitors();
        }).catch(() => {
            // Modal dismissed
        });
    }

    linkExisting(monitor: UptimeMonitor) {
        const projectIds = [...(monitor.projects?.map(p => p.id) || []), this.project().id];
        this.#service.update(monitor.id, { project_ids: projectIds } as any).subscribe(() => {
            this.loadMonitors();
            this.loadAllMonitors();
        });
    }

    unlinkMonitor(monitor: UptimeMonitor) {
        const projectIds = (monitor.projects?.map(p => p.id) || []).filter(id => id !== this.project().id);
        this.#service.update(monitor.id, { project_ids: projectIds } as any).subscribe(() => {
            this.loadMonitors();
            this.loadAllMonitors();
        });
    }
}
