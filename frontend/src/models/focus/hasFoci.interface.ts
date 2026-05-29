import { Signal } from '@angular/core';
import { Focus } from './focus.model';
import { Assignee } from '@models/assignee/assignee.model';
export interface IHasFoci {
    foci: Focus[];
    class: string;
    id: string;
    hasTimeBudget: () => boolean;
    icon: string;
    pivot?: Assignee;
    badge: Signal<[string, string] | undefined>;
    ngLink: Signal<string | undefined>;
    getName: () => string;
    apiPath: () => string;
    apiPathWithId: () => string;
}

export interface IHasFociGuard {
    object: Signal<IHasFoci>;
}
