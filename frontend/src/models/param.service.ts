import { Injectable } from "@angular/core"
import { Param } from "src/models/param.model"
import moment from "moment"
import { NexusHttpService } from "./http/http.nexus"

@Injectable({ providedIn: 'root' })
export class ParamService extends NexusHttpService<Param> {
    public apiPath = ''
    public TYPE = () => Param

    show = (key: string, data:any = {}) => this.get(`${key}`, data)
    update = (key: string, data: any) => this.put(`${key}`, data)
    history = (key: string, since: number = moment().startOf('day').subtract(14, 'days').unix(), cluster: string = 'day') => this.aget<any>(key + '/history', { since: since, cluster: cluster }, Object)
}