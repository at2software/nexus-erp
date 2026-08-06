import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { Project } from '@models/project/project.model';

export interface AddMilestoneResult {
    name: string;
    workload_hours: number;
    started_at: string;
    due_at: string;
    project: Project;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'modal-add-milestone',
    templateUrl: './modal-add-milestone.component.html',
    imports: [FormsModule],
})
export class ModalAddMilestoneComponent extends ModalBaseComponent<AddMilestoneResult> {
    projects = signal<Project[]>([]);

    projectId = signal('');
    name = signal('');
    workloadHours = signal(8);
    startedAt = signal('');
    dueAt = signal('');

    readonly selectedProject = computed(() => this.projects().find((p) => String(p.id) === this.projectId()));

    init(projects: Project[], date: string): void {
        this.projects.set(projects);
        this.projectId.set(String(projects[0]?.id ?? ''));
        this.startedAt.set(date);
        this.dueAt.set(date);
    }

    canSubmit = (): boolean => !!this.selectedProject() && !!this.name().trim() && this.workloadHours() > 0 && !!this.startedAt() && !!this.dueAt();

    onSuccess(): AddMilestoneResult {
        return {
            name: this.name().trim(),
            workload_hours: this.workloadHours(),
            started_at: this.startedAt(),
            due_at: this.dueAt(),
            project: this.selectedProject()!,
        };
    }
}
