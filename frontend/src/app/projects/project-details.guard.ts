import { Injectable, inject } from "@angular/core"
import { IHasFociGuard } from "@models/focus/hasFoci.interface"
import { DetailGuard } from "src/guards/detail.guard"
import { Project } from "src/models/project/project.model"
import { ProjectService } from "src/models/project/project.service"

@Injectable({ providedIn: 'root' })
export class ProjectDetailGuard extends DetailGuard<Project> implements IHasFociGuard {
    
    parent?:Project
    service = inject(ProjectService)

    observable = (id:string) => this.service.show(id)

    onBeforeLoad() { 
        this.parent = undefined
    }
    async onLoaded(_:Project) {
        this.parent = _.parent_project
    }
    setParent = (_?:Project) => this.current.update({ project_id: (_ ? _.id : null) }).subscribe(() => {
        this.parent = _
    })
}
