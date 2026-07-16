import { Dictionary } from '@constants/constants';
import { Injectable, inject } from '@angular/core';
import { dayjs } from '@constants/dates';
import { ReplaySubject, map } from 'rxjs';
import { ParamService } from '@models/param.service';

@Injectable({ providedIn: 'root' })
export class PersistentStatsService {
    paramService = inject(ParamService);
    stats: Dictionary<ReplaySubject<unknown>> = {};

    static startOfStats = () => dayjs().startOf('month').subtract(36, 'month');
    statsFor = (key: string, offset: 'none' | 'month' | 'year' = 'none', cluster: string = 'month'): ReplaySubject<unknown> => {
        const rpl = key + '-' + offset;
        let since = PersistentStatsService.startOfStats();
        if (offset != 'none') {
            since = since.subtract(1, offset);
        }
        if (!(rpl in this.stats)) {
            this.stats[rpl] = new ReplaySubject<unknown>(1);
            let obs = this.paramService.history(key, since.unix(), cluster);
            if (offset != 'none') {
                obs = obs.pipe(
                    map((result) => {
                        result.data = result.data
                            .map((_) => ({
                                ..._,
                                x: dayjs(_.x).add(1, offset).format('YYYY-MM-DD')
                            }))
                            .filter((_) => dayjs(_.x).isBefore(dayjs()));
                        return result;
                    }),
                );
            }
            obs.subscribe((_) => this.stats[rpl].next(_));
        }
        return this.stats[rpl];
    };
}
