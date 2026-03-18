import { Injectable, inject } from "@angular/core";
import moment from "moment";
import { ReplaySubject, map } from "rxjs";
import { ParamService } from "src/models/param.service";

@Injectable({ providedIn: 'root' })
export class PersistentStatsService {
    paramService = inject(ParamService)
    stats : Record<string, ReplaySubject<any>> = {}

    static startOfStats = () => moment().startOf('month').subtract(36, "month")
    statsFor = (key:string, offset:"none"|"month"|"year" = "none", cluster:string = 'month'):ReplaySubject<any> => {
        const rpl = key + '-' + offset
        let since = PersistentStatsService.startOfStats()
        if (offset != "none") {
            since = since.subtract(1, offset)
        }
        if (!(rpl in this.stats)) {
            this.stats[rpl] = new ReplaySubject<any>(1)
            let obs = this.paramService.history(key, since.unix(), cluster)
            if (offset != "none") {
                obs = obs.pipe(map((result:any) => {
                    result['data'] = result['data']
                        .map((_:any) => {
                            _.x = moment(_.x).add(1, offset).format('YYYY-MM-DD')
                            return _
                        })
                        .filter((_:any) => moment(_.x) < moment())
                    return result
                }))
            }
            obs.subscribe(_ => this.stats[rpl].next(_))
        } 
        return this.stats[rpl]
    }
}