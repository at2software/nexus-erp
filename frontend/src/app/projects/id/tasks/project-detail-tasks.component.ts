import { Component, OnInit, inject } from '@angular/core';
import { Task } from 'src/models/tasks/task.model';
import { forkJoin } from 'rxjs';
import { flat } from 'src/constants/flat';
import { PluginInstanceFactory } from 'src/models/http/plugin.instance.factory';
import { ITaskPlugin } from 'src/models/tasks/task.plugin.interface';
import { Color } from 'src/constants/Color';
import { ProjectDetailGuard } from '../../project-details.guard';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UlCompactComponent } from '@shards/ul-compact/ul-compact.component';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'project-detail-tasks',
    templateUrl: './project-detail-tasks.component.html',
    styleUrls: ['./project-detail-tasks.component.scss'],
    standalone: true,
    imports: [CommonModule, FormsModule, UlCompactComponent, Nx, NComponent, NgbTooltipModule]
})
export class ProjectDetailTasksComponent implements OnInit {

    newTask:Task
    tasks:Task[] = []
    instances:ITaskPlugin[] = []

    parent = inject(ProjectDetailGuard)    
    factory = inject(PluginInstanceFactory)

    ngOnInit(): void {
        this.parent.onChange.subscribe(() => {
            this.parent.current.getTaskInstances().then(instances => {
                this.instances = instances
                this.newTask = new Task()
                this.newTask.httpService = instances[0]
                this.reloadTasks()
            })
        })
    }
    
    onCreate = (event:any) => {
        event.stopPropagation()
        event.preventDefault()
        const service = this.newTask.httpService
        service.create(this.newTask).subscribe(_ => this.reloadTasks())
        this.newTask = new Task
        this.newTask.httpService = service
    }
    actionsResolved = () => this.reloadTasks()
    getLabelFor = (_:string, i:Task) => i.httpService.getLabelFor(_)
    
    reloadTasks   = () => {     
        const sub = this.instances.map(_ => _.indexTasks())
        forkJoin(sub).subscribe(tasks => this.tasks = flat(tasks))
    }
    hideIcon = ($e:any) => {
        $e.target.src = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z/C/HgAGgwJ/lK3Q6wAAAABJRU5ErkJggg=='
    }
    colorFor = (_:Task) => _?.user_name?.length ? Color.uniqueColorFromString(_.user_name) : '#333333'

}