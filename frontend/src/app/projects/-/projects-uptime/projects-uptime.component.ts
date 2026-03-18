import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { UptimeMonitor } from '@models/uptime/uptime-monitor.model';
import { UptimeMonitorService } from '@models/uptime/uptime-monitor.service';
import { UptimeCheck } from '@models/uptime/uptime-check.model';
import { GlobalService } from '@models/global.service';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { NexusModule } from '@app/nx/nexus.module';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { UptimeMonitorModalService } from '@app/_modals/modal-uptime-monitor/modal-uptime-monitor.component';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

@Component({
    selector: 'projects-uptime',
    standalone: true,
    imports: [CommonModule, NgbTooltipModule, NexusModule, ToolbarComponent, AvatarComponent, EmptyStateComponent],
    templateUrl: './projects-uptime.component.html',
    styleUrls: ['./projects-uptime.component.scss']
})
export class ProjectsUptimeComponent implements OnInit {
    monitors: UptimeMonitor[] = [];
    loading = true;
    checksCache = new Map<string, UptimeCheck[]>();

    global = inject(GlobalService);
    #service = inject(UptimeMonitorService);
    #modalService = inject(UptimeMonitorModalService);

    ngOnInit() {
        this.loadMonitors();
    }

    loadMonitors() {
        this.loading = true;
        this.#service.index().subscribe({
            next: (monitors) => {
                this.monitors = monitors;
                this.setupMonitorCallbacks();
                this.loading = false;
            },
            error: () => this.loading = false
        });
    }

    setupMonitorCallbacks() {
        this.monitors.forEach(monitor => {
            monitor.var.onTestRequested = (m: UptimeMonitor) => this.testMonitor(m);
            monitor.var.onEditRequested = (m: UptimeMonitor) => this.openEditModal(m);
            monitor.var.onEditSuccess = () => this.loadMonitors();
            monitor.var.onDeleteSuccess = () => this.loadMonitors();
            monitor.var.onSubscribeSuccess = () => this.loadMonitors();
            monitor.var.onUnsubscribeSuccess = () => this.loadMonitors();
        });
    }

    openEditModal(monitor: UptimeMonitor) {
        this.#modalService.open(monitor).then(() => this.loadMonitors()).catch(() => {
            // Modal dismissed
        });
    }

    openCreateModal() {
        this.#modalService.open().then(() => this.loadMonitors()).catch(() => {
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

    loadChecksForMonitor(monitor: UptimeMonitor) {
        if (this.checksCache.has(monitor.id)) return;
        this.#service.indexChecks(monitor, 30).subscribe(checks => this.checksCache.set(monitor.id, checks));
    }

    getChecks(monitor: UptimeMonitor): UptimeCheck[] {
        return this.checksCache.get(monitor.id) || [];
    }

    getSparklineData(monitor: UptimeMonitor): { percentage: number, color: string, day: string }[] {
        const checks = this.getChecks(monitor);
        if (checks.length === 0) return [];

        // Group checks by day
        const checksByDay = new Map<string, UptimeCheck[]>();
        checks.forEach(check => {
            const day = new Date(check.checked_at).toDateString();
            if (!checksByDay.has(day)) checksByDay.set(day, []);
            checksByDay.get(day)!.push(check);
        });

        // Calculate daily uptime percentages with colors
        return Array.from(checksByDay.entries())
            .sort(([dayA], [dayB]) => new Date(dayA).getTime() - new Date(dayB).getTime())
            .map(([day, dayChecks]) => {
                const upCount = dayChecks.filter(c => c.isUp).length;
                const percentage = (upCount / dayChecks.length) * 100;

                let color: string;
                if (percentage === 100) color = 'success';
                else if (percentage > 95) color = 'warning';
                else if (percentage > 90) color = 'orange';
                else color = 'danger';

                return { percentage, color, day };
            });
    }

    getUptimePercentage(monitor: UptimeMonitor): number {
        const checks = this.getChecks(monitor);
        if (checks.length === 0) return 100;

        const upChecks = checks.filter(c => c.isUp).length;
        return Math.round((upChecks / checks.length) * 100);
    }
}
