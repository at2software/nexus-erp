import { Injectable } from '@angular/core';
import { Param } from '@models/param.model';
import { NexusHttpService } from './http/http.nexus';
import { Dictionary } from '@constants/constants';
import { ParamChartSeries } from './api-response';

@Injectable({ providedIn: 'root' })
export class ParamService extends NexusHttpService<Param> {
    public apiPath = '';
    override readonly model = Param;

    show = (key: string, data: Dictionary = {}) => this.get(`${key}`, data, Param);
    update = (key: string, data: object) => this.put(`${key}`, data);
    history = (keys: string, since: number, cluster: string = 'day') => this.aget<ParamChartSeries>(keys + '/history', { since: since, cluster: cluster });
}
