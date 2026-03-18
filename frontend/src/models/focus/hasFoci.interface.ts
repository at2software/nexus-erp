import { ReplaySubject } from "rxjs";
import { Focus } from "./focus.model";
import { Assignee } from "@models/assignee/assignee.model";

export interface IHasFoci {
    foci            : Focus[]
    class           : string
    id              : string
    name            : string
    has_time_budget : boolean
    icon            : string
    pivot          ?: Assignee
    badge: undefined | [string, string];
    ngLink?:string
    getApiPath: () => string
    getApiPathWithId: () => string
}

export interface IHasFociGuard {
    onChange: ReplaySubject<any>
    current: IHasFoci
}