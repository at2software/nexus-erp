import { Serializable } from '../serializable';
import { AutoWrap, AutoWrapArray } from '@constants/autowrap';
import { User } from '../user/user.model';
import { Project } from '../project/project.model';
import { UptimeCheck } from './uptime-check.model';
import { UptimeMonitorService } from './uptime-monitor.service';
import { NxAction } from '@app/nx/nx.actions';
import { getUptimeMonitorActions } from './uptime-monitor.actions';
import { Observable, tap } from 'rxjs';
import { NxGlobal } from '@app/nx/nx.global';

export class UptimeMonitor extends Serializable {
    static API_PATH = (): string => 'uptime_monitors';

    SERVICE = UptimeMonitorService;
    actions: NxAction[] = getUptimeMonitorActions(this);

    name!: string;
    url!: string;
    method: string = 'GET';
    expected_status_code: number = 200;
    timeout: number = 30;
    response_time_threshold: number = 5000;
    check_interval: number = 300;
    is_active: boolean = true;
    request_headers?: Record<string, string>;
    request_body?: string;
    last_check_at?: string;
    last_status: 'up' | 'down' | 'degraded' | 'pending' = 'pending';
    last_notified_at?: string;
    created_by_user_id!: string;

    @AutoWrap('User') createdBy?: User;
    @AutoWrapArray('Project') projects: Project[] = [];
    @AutoWrapArray('User') recipients: User[] = [];
    @AutoWrap('UptimeCheck') latestCheck?: UptimeCheck;

    get statusIcon(): string {
        switch (this.last_status) {
            case 'up': return 'check_circle';
            case 'down': return 'cancel';
            case 'degraded': return 'warning';
            default: return 'radio_button_unchecked';
        }
    }

    get statusColor(): string {
        switch (this.last_status) {
            case 'up': return 'success';
            case 'down': return 'danger';
            case 'degraded': return 'warning';
            default: return 'secondary';
        }
    }

    runTest() {
        this.var.onTestRequested?.(this);
    }

    openEdit() {
        this.var.onEditRequested?.(this);
    }

    isSubscribed(): boolean {
        const currentUserId = NxGlobal.global.user?.id;
        return this.recipients?.some(u => u.id === currentUserId) ?? false;
    }

    subscribe() {
        const currentUserId = NxGlobal.global.user?.id;
        if (!currentUserId) return;
        const recipientIds = [...(this.recipients?.map(u => u.id) || []), currentUserId];
        this.httpService.put(this.getApiPathWithId(), { recipient_ids: recipientIds })
            .subscribe(() => this.var.onSubscribeSuccess?.(this));
    }

    unsubscribe() {
        const currentUserId = NxGlobal.global.user?.id;
        if (!currentUserId) return;
        const recipientIds = (this.recipients?.map(u => u.id) || []).filter(id => id !== currentUserId);
        this.httpService.put(this.getApiPathWithId(), { recipient_ids: recipientIds })
            .subscribe(() => this.var.onUnsubscribeSuccess?.(this));
    }

    unlinkFromProject() {
        this.var.onUnlinkFromProject?.(this);
    }

    override delete(): Observable<any> {
        return this.httpService.delete(this.getApiPathWithId())
            .pipe(tap(() => this.var.onDeleteSuccess?.(this)));
    }
}
