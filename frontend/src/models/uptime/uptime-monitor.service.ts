import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NexusHttpService } from '../http/http.nexus';
import { UptimeMonitor } from './uptime-monitor.model';
export interface UptimeCheckDay {
    day: string;
    up_count: number;
    down_count: number;
    degraded_count: number;
    total: number;
}
import { Dictionary } from '@constants/constants';

@Injectable({ providedIn: 'root' })
export class UptimeMonitorService extends NexusHttpService<UptimeMonitor> {
    public apiPath = 'uptime_monitors';
    public TYPE = () => UptimeMonitor;

    index = (filters?: Dictionary): Observable<UptimeMonitor[]> => {
        return this.aget(this.apiPath, filters, UptimeMonitor);
    }

    show = (id: string): Observable<UptimeMonitor> => {
        return this.get(`${this.apiPath}/${id}`, {}, UptimeMonitor);
    }

    store = (data: Partial<UptimeMonitor>): Observable<UptimeMonitor> => {
        return this.post(this.apiPath, data, UptimeMonitor);
    }

    update = (id: string, data: Partial<UptimeMonitor>): Observable<UptimeMonitor> => {
        return this.put(`${this.apiPath}/${id}`, data, UptimeMonitor);
    }

    destroy = (id: string): Observable<any> => {
        return this.delete(`${this.apiPath}/${id}`);
    }

    indexChecks = (monitor: UptimeMonitor, days: number = 30): Observable<UptimeCheckDay[]> => {
        return this.get(`${this.apiPath}/${monitor.id}/checks`, { days });
    }

    stats = (monitor: UptimeMonitor): Observable<any> => {
        return this.get(`${this.apiPath}/${monitor.id}/stats`);
    }

    testCheck = (monitor: UptimeMonitor, withNotification: boolean = false): Observable<any> => {
        return this.post(`${this.apiPath}/${monitor.id}/test`, { with_notification: withNotification });
    }

    updateRecipient = (monitor: UptimeMonitor, userId: string, preferences: any): Observable<any> => {
        return this.put(`${this.apiPath}/${monitor.id}/recipients/${userId}`, preferences);
    }
}
