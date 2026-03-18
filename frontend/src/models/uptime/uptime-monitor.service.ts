import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NexusHttpService } from '../http/http.nexus';
import { UptimeMonitor } from './uptime-monitor.model';
import { UptimeCheck } from './uptime-check.model';
import { Dictionary } from '@constants/constants';
import { Project } from '../project/project.model';

@Injectable({ providedIn: 'root' })
export class UptimeMonitorService extends NexusHttpService<UptimeMonitor> {
    public apiPath = 'uptime_monitors';
    public TYPE = () => UptimeMonitor;

    index = (filters?: Dictionary): Observable<UptimeMonitor[]> => {
        return this.aget(this.apiPath, filters, UptimeMonitor);
    }

    indexForProject = (project: Project, filters?: Dictionary): Observable<UptimeMonitor[]> => {
        return this.aget(`projects/${project.id}/uptime_monitors`, filters, UptimeMonitor);
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

    indexChecks = (monitor: UptimeMonitor, days: number = 30): Observable<UptimeCheck[]> => {
        return this.aget(`${this.apiPath}/${monitor.id}/checks`, { days }, UptimeCheck);
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
