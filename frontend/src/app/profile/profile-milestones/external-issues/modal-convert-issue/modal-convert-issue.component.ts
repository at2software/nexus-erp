import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { Project } from '@models/project/project.model';
import { ExtIssueBacklogItem } from '../ext-issue-backlog.service';

export interface ConvertIssueResult {
    name: string;
    workload_hours: number;
    started_at: string;
    due_at: string;
    project: Project;
    pluginLinkId?: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'modal-convert-issue',
    templateUrl: './modal-convert-issue.component.html',
    imports: [FormsModule],
})
export class ModalConvertIssueComponent extends ModalBaseComponent<ConvertIssueResult> {
    issue!: ExtIssueBacklogItem;

    projectId = signal('');
    name = signal('');
    workloadHours = signal(8);
    startedAt = signal('');
    dueAt = signal('');

    readonly projects = computed(() => this.issue.resolved.map((r) => r.project));
    readonly selectedMatch = computed(() => this.issue.resolved.find((r) => String(r.project.id) === this.projectId()));

    init(issue: ExtIssueBacklogItem, dropDate: string): void {
        this.issue = issue;
        this.projectId.set(String(issue.resolved[0]?.project.id ?? ''));
        this.name.set(issue.task.name);
        this.startedAt.set(dropDate);
        this.dueAt.set(dropDate);
    }

    canSubmit = (): boolean => !!this.selectedMatch() && !!this.name().trim() && this.workloadHours() > 0 && !!this.startedAt() && !!this.dueAt();

    onSuccess(): ConvertIssueResult {
        const match = this.selectedMatch()!;
        return {
            name: this.name().trim(),
            workload_hours: this.workloadHours(),
            started_at: this.startedAt(),
            due_at: this.dueAt(),
            project: match.project,
            pluginLinkId: match.pluginLinkId,
        };
    }
}
