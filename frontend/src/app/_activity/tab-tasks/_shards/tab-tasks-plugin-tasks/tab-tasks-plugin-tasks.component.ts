import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NexusModule } from '@app/nx/nexus.module';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { Color } from '@constants/Color';
import { PluginInstance } from '@models/http/plugin.instance';
import { PluginInstanceFactory } from '@models/http/plugin.instance.factory';
import { Task } from '@models/tasks/task.model';
import { ITaskPlugin } from '@models/tasks/task.plugin.interface';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { takeUntil } from 'rxjs';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';

type TTask = ITaskPlugin & PluginInstance

@Component({
    selector: 'tab-tasks-plugin-tasks',
    templateUrl: './tab-tasks-plugin-tasks.component.html',
    standalone: true,
    imports: [NexusModule, NgbTooltipModule, RouterModule]
})
export class TabTasksPluginTasksComponent extends TabTasksBaseComponent {

    instances: TTask[] = []

    factory = inject(PluginInstanceFactory)
    input = inject(InputModalService)

    override reload() {
        this.instances = this.factory.getPluginInstances().filter(_ => 'ITaskPluginProperty' in _ && _.isRootInstance()) as TTask[]
        this.instances.forEach(instance => this.#loadInstance(instance))
    }

    #loadInstance(instance: TTask) {
        instance.init.pipe(takeUntil(this.destroy$)).subscribe(() => {
            instance.indexTasks().pipe(takeUntil(this.destroy$)).subscribe(response => {
                instance.tasks = response
            })
        })
    }

    onNewTask(instance: TTask) {
        this.input.open('title', true).then(response => {
            if (response) {
                const n = Task.fromJson({ name: response.text })
                instance.create(n).pipe(takeUntil(this.destroy$)).subscribe(response => {
                    const newTask = Task.fromJson(response)
                    newTask.var.user = instance.getUserFor(newTask.assignee?.id)
                    newTask.var.compact = (newTask.state == 1)
                    newTask.httpService = instance
                    instance.tasks.push(newTask)
                })
            }
        }).catch()
    }

    colorFor(task: Task): string;
    colorFor(label: string): string;
    colorFor(input: Task | string): string {
        if (typeof input === 'string') return Color.uniqueColorFromString(input ?? '')
        return Color.uniqueColorFromString(input.project_url ?? '')
    }
}
