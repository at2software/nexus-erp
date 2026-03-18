
import { Component, EventEmitter, Input, Output, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ProjectAvatar } from '@models/project/project-state.model';
import { ProjectComponent } from '@shards/project/project.component';
import { Dictionary, filtered } from 'src/constants/constants';
import { getCookie, setCookie } from 'src/constants/cookies';
import { Project } from 'src/models/project/project.model';

type TFilter = Record<string, Project>;

@Component({
    selector: 'project-state-filter',
    templateUrl: './project-state-filter.component.html',
    styleUrls: ['./project-state-filter.component.scss'],
    standalone: true,
    imports: [ProjectComponent, FormsModule]
})
export class ProjectStateFilterComponent implements OnInit {

    @Input() cookieId: string = 'PROJECT_STATE_FILTER'
    @Input() defaultEnableAll:boolean = false

    @Output() filterChanged = new EventEmitter<Project>()

    filters: TFilter = {
        prepared   : ProjectAvatar.Prepared({ var: { enabled: true }}),
        inProgress : ProjectAvatar.Running({ var: { enabled: true }, is_time_based: false }),
        finished   : ProjectAvatar.Successful({ var: { enabled: false } }),
        failed     : ProjectAvatar.Failed({ var: { enabled: false } }),
        alternative: ProjectAvatar.Ignored({ var: { enabled: false } }),
        budgetBased: ProjectAvatar.BudgetBased({ var: { filter: 0, enabled: true } }),
        timeBased  : ProjectAvatar.TimeBased({ var: { filter: 1, enabled: true } }),
        internal   : ProjectAvatar.Internal({ var: { filter: 1, enabled: false } }),
        external   : ProjectAvatar.External({ var: { filter: 0, enabled: true } }),
    }
    stateFilters: Project[] = [
        this.filters.prepared,
        this.filters.inProgress,
        this.filters.finished,
        this.filters.failed,
        this.filters.alternative
    ]
    #filterIconsInternal: Project[] = [
        this.filters.internal,
        this.filters.external,
    ]
    #filterIconsBudgeting: Project[] = [
        this.filters.timeBased,
        this.filters.budgetBased,
    ]

    #applyCookie(array: Project[], data: number[]) {
        for (let i = 0; i < data.length; i++) {
            if (i in array) {
                array[i].var.enabled = data[i]
            }
        }
    }
    ngOnInit() {
        const cookieData = getCookie(this.cookieId)
        if (cookieData) {
            const parsed: any = JSON.parse(cookieData)
            if (parsed) {
                const [states, internal, budgeting] = parsed
                this.#applyCookie(this.#filterIconsInternal, internal)
                this.#applyCookie(this.#filterIconsBudgeting, budgeting)
                this.#applyCookie(this.stateFilters, states)
            } else {
                this.enableAllIfRequired()
            }
        } else {
            this.enableAllIfRequired()
        }
    }

    getFilters(): Dictionary {
        const data = {
            states       : Object.values(this.stateFilters).filter(_ => _.var.enabled).map(_ => _.var.filter),
            is_internal  : Object.values(this.#filterIconsInternal).filter(_ => _.var.enabled).map(_ => _.var.filter),
            is_time_based: Object.values(this.#filterIconsBudgeting).filter(_ => _.var.enabled).map(_ => _.var.filter),
        }
        return filtered(data)
    }

    #filterWillHide (project:Project, filterProject:Project, checkKeys:string[]) {
        if (filterProject.var.enabled) return false
        const checkAppliesToProject = checkKeys.map(key => (project as any)[key] === (filterProject as any)[key]).reduce((a, b) => a && b, true)
        return checkAppliesToProject
    }

    isHidden(p:Project):boolean {
        // show project, if there is a subproject that is still shown, even if the filters do not match
        if (p.var.subprojects.length) {
            const allChildrenHidden = p.var.subprojects.map((_:Project) => this.isHidden(_)).reduce((a:boolean, b:boolean) => a && b, true)            
            if (!allChildrenHidden) return false
        }
        // check filters
        if (this.#filterWillHide(p, this.filters.prepared, ['state'])) return true
        if (this.#filterWillHide(p, this.filters.inProgress, ['state'])) return true
        if (this.#filterWillHide(p, this.filters.finished, ['state', 'finished_state'])) return true
        if (this.#filterWillHide(p, this.filters.failed, ['state', 'finished_state'])) return true
        if (this.#filterWillHide(p, this.filters.alternative, ['state', 'finished_state'])) return true
        if (this.#filterWillHide(p, this.filters.budgetBased, ['is_time_based'])) return true
        if (this.#filterWillHide(p, this.filters.timeBased, ['is_time_based'])) return true
        if (this.#filterWillHide(p, this.filters.internal, ['is_internal'])) return true
        if (this.#filterWillHide(p, this.filters.external, ['is_internal'])) return true
        return false
    }

    onValueChanged(project: Project) {
        const data = [
            Object.values(this.stateFilters).map(_ => _.var.enabled),
            Object.values(this.#filterIconsBudgeting).map(_ => _.var.enabled),
            Object.values(this.#filterIconsInternal).map(_ => _.var.enabled),
        ]
        setCookie(this.cookieId, JSON.stringify(data), 7)
        this.filterChanged.next(project)
    }
    enableAllIfRequired() {
        if (this.defaultEnableAll) {
            this.stateFilters.forEach(_ => _.var.enabled = true)
            this.#filterIconsBudgeting.forEach(_ => _.var.enabled = true)
            this.#filterIconsInternal.forEach(_ => _.var.enabled = true)
        }
    }
}
