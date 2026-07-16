import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { forkJoin, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { UptimeMonitor } from '@models/uptime/uptime-monitor.model';
import { UptimeMonitorService } from '@models/uptime/uptime-monitor.service';
import { UptimeCheckDay } from '@models/api-response';
import { GlobalService } from '@models/global.service';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { UptimeMonitorModalService } from '@app/_modals/modal-uptime-monitor/modal-uptime-monitor.component';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { SpinnerComponent } from '@shards/spinner/spinner.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'projects-uptime',
    imports: [DatePipe, NgbTooltipModule, Nx, AvatarComponent, ToolbarComponent, AvatarComponent, EmptyStateComponent, SpinnerComponent],
    templateUrl: './projects-uptime.component.html',
    styleUrls: ['./projects-uptime.component.scss'],
})
export class ProjectsUptimeComponent {
    monitors = signal<UptimeMonitor[]>([]);
    loading = signal(true);
    checksCache = signal(new Map<string, UptimeCheckDay[]>());

    global = inject(GlobalService);
    #service = inject(UptimeMonitorService);
    #modalService = inject(UptimeMonitorModalService);

    constructor() {
        this.loadMonitors();
    }

    loadMonitors() {
        this.loading.set(true);
        this.#service.index().subscribe({
            next: (monitors) => {
                this.monitors.set(monitors);
                this.setupMonitorCallbacks();
                this.loading.set(false);
                this.loadAllChecks();
            },
            error: () => this.loading.set(false),
        });
    }

    setupMonitorCallbacks() {
        this.monitors().forEach((monitor) => {
            monitor.var.onTestRequested = (m: UptimeMonitor) => this.testMonitor(m);
            monitor.var.onEditRequested = (m: UptimeMonitor) => this.openEditModal(m);
            monitor.var.onEditSuccess = () => this.loadMonitors();
            monitor.var.onDeleteSuccess = () => this.loadMonitors();
            monitor.var.onSubscribeSuccess = () => this.loadMonitors();
            monitor.var.onUnsubscribeSuccess = () => this.loadMonitors();
        });
    }

    openEditModal(monitor: UptimeMonitor) {
        this.#modalService
            .open(monitor)
            .then(() => this.loadMonitors())
            .catch(() => {
                // Modal dismissed
            });
    }

    openCreateModal() {
        this.#modalService
            .open()
            .then(() => this.loadMonitors())
            .catch(() => {
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
            error: (err) => alert($localize`:@@i18n.uptime.testFailed:test failed` + `:\n${err?.error?.message || err?.message || 'Unknown error'}`),
        });
    }

    loadAllChecks() {
        if (!this.monitors().length) return;
        forkJoin(
            this.monitors().map((m) =>
                this.#service.indexChecks(m, 30).pipe(
                    map((checks) => ({ id: m.id, checks })),
                    catchError(() => of({ id: m.id, checks: [] as UptimeCheckDay[] })),
                ),
            ),
        ).subscribe((results) => {
            const next = new Map(this.checksCache());
            results.forEach((r) => next.set(r.id, r.checks));
            this.checksCache.set(next);
        });
    }

    getChecks(monitor: UptimeMonitor): UptimeCheckDay[] {
        return this.checksCache().get(monitor.id) || [];
    }

    getSparklineData(monitor: UptimeMonitor): { percentage: number; color: string; day: string }[] {
        return this.getChecks(monitor).map((d) => {
            const percentage = (d.up_count / d.total) * 100;
            let color: string;
            if (percentage === 100) color = 'success';
            else if (percentage > 95) color = 'warning';
            else if (percentage > 90) color = 'orange';
            else color = 'danger';
            return { percentage, color, day: d.day };
        });
    }

    getUptimePercentage(monitor: UptimeMonitor): number {
        const days = this.getChecks(monitor);
        if (!days.length) return 100;
        const upTotal = days.reduce((sum, d) => sum + Number(d.up_count), 0);
        const total = days.reduce((sum, d) => sum + Number(d.total), 0);
        return Math.round((upTotal / total) * 100);
    }
}
