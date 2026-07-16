import { Signal } from '@angular/core';
import type { Focus } from './focus.model';
import type { Assignee } from '@models/assignee/assignee.model';
import type { ProjectTimelineEntry } from '@models/api-response';
import { Serializable } from '@models/serializable';

// Extending Serializable guarantees every IHasFoci is a Serializable model: because Serializable
// carries protected/private members, only its subclasses can satisfy this interface.
export interface IHasFoci extends Serializable {
    foci: Focus[];
    hasTimeBudget: () => boolean;
    pivot?: Assignee;
    timeline_chart?: ProjectTimelineEntry[];
}

export interface IHasFociGuard {
    object: Signal<IHasFoci>;
}
