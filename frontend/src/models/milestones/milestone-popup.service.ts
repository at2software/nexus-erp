import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import { Milestone } from './milestone.model';
import { Project } from '../project/project.model';

export interface MilestonePopupRequest {
    milestone: Milestone
    project?: Project
}

@Injectable({ providedIn: 'root' })
export class MilestonePopupService {
    #openRequest = new Subject<MilestonePopupRequest>()

    openRequest$ = this.#openRequest.asObservable()

    open(milestone: Milestone, project?: Project) {
        this.#openRequest.next({ milestone, project })
    }
}
