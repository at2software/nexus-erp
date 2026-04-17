
import { Component, OnInit, input, output } from '@angular/core';
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

    cookieId       = input<string>('PROJECT_STATE_FILTER')
    defaultEnableAll = input<boolean>(false)

    filterChanged = output<Project>()

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

    ngOnInit() {
        const cookieData = getCookie(this.cookieId())
        if (cookieData) {
            const parsed = JSON.parse(cookieData)
            if (parsed) {
                const [states, internal, budgeting] = parsed
                this.#applyCookie(this.#filterIconsInternal, internal)
                this.#applyCookie(this.#filterIconsBudgeting, budgeting)
                this.#applyCookie(this.stateFilters, states)
            } else {
                this.#enableAllIfRequired()
            }
        } else {
            this.#enableAllIfRequired()
        }
    }

    #applyCookie(array: Project[], data: number[]) {
        for (let i = 0; i < data.length; i++) {
            if (i in array) array[i].var.enabled = data[i]
        }
    }

    getFilters(): Dictionary {
        return filtered({
            states       : this.stateFilters.filter(_ => _.var.enabled).map(_ => _.var.filter),
            is_internal  : this.#filterIconsInternal.filter(_ => _.var.enabled).map(_ => _.var.filter),
            is_time_based: this.#filterIconsBudgeting.filter(_ => _.var.enabled).map(_ => _.var.filter),
        })
    }

    #filterWillHide(project: Project, filterProject: Project, checkKeys: string[]): boolean {
        if (filterProject.var.enabled) return false
        return checkKeys.every(key => (project as any)[key] === (filterProject as any)[key])
    }

    isHidden(p: Project): boolean {
        if (p.var.subprojects.length && p.var.subprojects.some((_: Project) => !this.isHidden(_))) return false
        return (
            this.#filterWillHide(p, this.filters.prepared,    ['state'])                   ||
            this.#filterWillHide(p, this.filters.inProgress,  ['state'])                   ||
            this.#filterWillHide(p, this.filters.finished,    ['state', 'finished_state']) ||
            this.#filterWillHide(p, this.filters.failed,      ['state', 'finished_state']) ||
            this.#filterWillHide(p, this.filters.alternative, ['state', 'finished_state']) ||
            this.#filterWillHide(p, this.filters.budgetBased, ['is_time_based'])           ||
            this.#filterWillHide(p, this.filters.timeBased,   ['is_time_based'])           ||
            this.#filterWillHide(p, this.filters.internal,    ['is_internal'])             ||
            this.#filterWillHide(p, this.filters.external,    ['is_internal'])
        )
    }

    onValueChanged(project: Project) {
        setCookie(this.cookieId(), JSON.stringify([
            this.stateFilters.map(_ => _.var.enabled),
            this.#filterIconsBudgeting.map(_ => _.var.enabled),
            this.#filterIconsInternal.map(_ => _.var.enabled),
        ]), 7)
        this.filterChanged.emit(project)
    }

    #enableAllIfRequired() {
        if (this.defaultEnableAll()) {
            [...this.stateFilters, ...this.#filterIconsBudgeting, ...this.#filterIconsInternal]
                .forEach(_ => _.var.enabled = true)
        }
    }
}
