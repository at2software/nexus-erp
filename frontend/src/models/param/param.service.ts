import { Service } from '@angular/core';
import { Param } from '@models/param/param.model';
import { NexusHttpService } from '../http/http.nexus';
import { Dictionary } from '@constants/constants';
import { ParamChartSeriesDto } from '@models/_core/api-response';

@Service()
export class ParamService extends NexusHttpService<Param> {
    public apiPath = '';
    override readonly model = Param;

    show = (key: string, data: Dictionary = {}) => this.get(`${key}`, data, Param);
    history = (keys: string, since: number, cluster: string = 'day') => this.aget<ParamChartSeriesDto>(keys + '/history', { since: since, cluster: cluster });
}
