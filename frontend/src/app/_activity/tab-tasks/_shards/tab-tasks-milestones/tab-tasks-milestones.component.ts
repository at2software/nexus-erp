import { ChangeDetectionStrategy, Component, computed, effect, inject } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { Milestone } from '@models/milestone/milestone.model';
import { MilestoneService } from '@models/milestone/milestone.service';
import { modelListResource, modelResource } from '@models/http/model-resource';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';

const isOverdue = (m: Milestone) => m.state === 1 && !!m.due_at && new Date(m.due_at) < new Date();
const needsStarting = (m: Milestone) => m.state === 0 && !!m.started_at && new Date(m.started_at) <= new Date();

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'tab-tasks-milestones',
    templateUrl: './tab-tasks-milestones.component.html',
    imports: [NgTemplateOutlet, Nx, NComponent, AvatarComponent, NgbTooltipModule],
})
export class TabTasksMilestonesComponent extends TabTasksBaseComponent {
    #milestoneService = inject(MilestoneService);

    #userMilestones = modelListResource(this.ready, () => this.#milestoneService.indexUserMilestones(this.global.user?.id || ''));
    #pmMilestones = modelResource(this.ready, () => this.#milestoneService.indexPmMilestones(this.global.user?.id || ''));

    #ownMilestones = computed(() => this.#userMilestones.value().flatMap((group) => group.milestones.map((m) => Object.assign(m, { project: group.project }))));
    #pmMilestonesOfOthers = computed(() =>
        (this.#pmMilestones.value()?.milestones ?? [])
            .flatMap((group) => group.milestones.map((m) => Object.assign(m, { project: group.project })))
            .filter((m) => m.user_id !== this.global.user?.id),
    );
    #pmMilestonesAssigned = computed(() => this.#pmMilestonesOfOthers().filter((m) => m.user_id !== null));

    milestonesOverdue = computed(() => [...this.#ownMilestones().filter(isOverdue), ...this.#pmMilestonesAssigned().filter(isOverdue)]);
    milestonesNeedStarting = computed(() => [
        ...this.#ownMilestones().filter((m) => !isOverdue(m) && needsStarting(m)),
        ...this.#pmMilestonesAssigned().filter((m) => !isOverdue(m) && needsStarting(m)),
    ]);
    milestonesRunning = computed(() => this.#ownMilestones().filter((m) => !isOverdue(m) && !needsStarting(m) && m.state === 1));
    milestonesNeedAssignment = computed(() => this.#pmMilestonesOfOthers().filter((m) => m.user_id === null));
    milestonesNoDuration = computed(() => this.#ownMilestones().filter((m) => m.state !== 2 && !m.workload_hours && !m.invoice_items?.length && !m.project?.is_time_based));
    projectsNoCoverage = computed(() => this.#pmMilestones.value()?.projectsNoCoverage ?? []);

    constructor() {
        super();
        effect(() => this.countChanged.emit(this.milestonesOverdue().length));
    }

    override reload() {
        this.#userMilestones.reload();
        this.#pmMilestones.reload();
    }
}
