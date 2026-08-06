import { Signal } from '@angular/core';
import type { Focus } from './focus.model';
import type { Assignee } from '@models/assignee/assignee.model';
import type { ProjectTimelineEntryDto } from '@models/_core/api-response';
import { Serializable } from '@models/_core/serializable';

export interface IHasFoci extends Serializable {
    foci: Focus[];
    hasTimeBudget: () => boolean;
    pivot?: Assignee;
    timeline_chart?: ProjectTimelineEntryDto[];
}

export interface IHasFociGuard {
    object: Signal<IHasFoci>;
}
