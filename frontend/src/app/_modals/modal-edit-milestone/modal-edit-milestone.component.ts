import { ChangeDetectionStrategy, Component } from '@angular/core';
import { NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { Milestone } from '@models/milestones/milestone.model';
import { Project } from '@models/project/project.model';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { MilestonePopupComponent } from '@app/projects/_shards/custom-gantt/milestone-popup/milestone-popup.component';

@Component({
    selector: 'modal-edit-milestone',
    templateUrl: './modal-edit-milestone.component.html',
    imports: [MilestonePopupComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalEditMilestoneComponent extends ModalBaseComponent<Milestone> {
    static override modalOptions: NgbModalOptions = { centered: true };

    milestone!: Milestone;
    project?: Project;
    projects: Project[] = [];

    init(milestone: Milestone, project?: Project, projects: Project[] = []): void {
        this.milestone = milestone;
        this.project = project;
        this.projects = projects;
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
