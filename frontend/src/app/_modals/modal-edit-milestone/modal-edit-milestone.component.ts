import { Component } from '@angular/core';
import { Milestone } from 'src/models/milestones/milestone.model';
import { Project } from 'src/models/project/project.model';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { MilestonePopupComponent } from '@app/projects/_shards/custom-gantt/milestone-popup/milestone-popup.component';

@Component({
    selector: 'modal-edit-milestone',
    templateUrl: './modal-edit-milestone.component.html',
    styleUrls: ['./modal-edit-milestone.component.scss'],
    standalone: true,
    imports: [
        MilestonePopupComponent
    ]
})
export class ModalEditMilestoneComponent extends ModalBaseComponent<Milestone> {
    milestone!: Milestone;
    project?: Project;

    init(milestone: Milestone, project?: Project): void {
        this.milestone = milestone;
        this.project = project;
    }

    onSuccess(): Milestone {
        return this.milestone;
    }

    onMilestoneUpdated(milestone: Milestone) {
        this.milestone = milestone;
    }

    onMilestoneDeleted() {
        this.dismiss();
    }
}
