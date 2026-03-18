import { Serializable } from '../serializable';
import { UptimeMonitorService } from './uptime-monitor.service';

export class UptimeCheck extends Serializable {
    static API_PATH = (): string => 'uptime_checks';

    SERVICE = UptimeMonitorService;
    uptime_monitor_id!: string;
    checked_at!: string;
    status!: 'up' | 'down' | 'degraded';
    response_time?: number;
    status_code?: number;
    error_message?: string;

    get isUp(): boolean {
        return this.status === 'up';
    }

    get isDown(): boolean {
        return this.status === 'down';
    }

    get isDegraded(): boolean {
        return this.status === 'degraded';
    }
}
