import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NexusHttpService } from '../http/http.nexus';
import { UptimeMonitor } from './uptime-monitor.model';
import { Dictionary } from '@constants/constants';
import { UptimeCheckDay } from '@models/api-response';
@Injectable({ providedIn: 'root' })
export class UptimeMonitorService extends NexusHttpService<UptimeMonitor> {
    public apiPath = 'uptime_monitors';
    override readonly model = UptimeMonitor;

    store = (data: Partial<UptimeMonitor>): Observable<UptimeMonitor> => {
        return this.post(this.apiPath, data, UptimeMonitor);
    };

    indexChecks = (monitor: UptimeMonitor, days: number = 30): Observable<UptimeCheckDay[]> => {
        return this.get(`${this.apiPath}/${monitor.id}/checks`, { days });
    };

    stats = (monitor: UptimeMonitor): Observable<any> => {
        return this.get(`${this.apiPath}/${monitor.id}/stats`);
    };

    testCheck = (monitor: UptimeMonitor, withNotification: boolean = false): Observable<any> => {
        return this.post(`${this.apiPath}/${monitor.id}/test`, { with_notification: withNotification });
    };

    updateRecipient = (monitor: UptimeMonitor, userId: string, preferences: Dictionary): Observable<any> => {
        return this.put(`${this.apiPath}/${monitor.id}/recipients/${userId}`, preferences);
    };
}
