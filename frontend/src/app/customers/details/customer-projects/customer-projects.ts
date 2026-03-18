import { Router } from '@angular/router';
import { Component, inject, ViewChild, AfterViewInit, ChangeDetectorRef, OnInit } from '@angular/core';
import { ProjectService } from '@models/project/project.service';
import { Project } from '@models/project/project.model';
import moment from 'moment';
import { ProjectStateFilterComponent } from '@app/projects/_shards/project-state-filter/project-state-filter.component';
import { CustomerDetailGuard } from '@app/customers/customers.details.guard';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { NexusModule } from '@app/nx/nexus.module';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { MoneyShortPipe } from '../../../../pipes/mshort.pipe';
import { PermissionsDirective } from '@directives/permissions.directive';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { CdkDragDrop, CdkDropList, CdkDrag } from '@angular/cdk/drag-drop';
import { ProjectState } from '@models/project/project-state.model';

@Component({
    selector: 'customer-projects',
    templateUrl: './customer-projects.html',
    styleUrls: ['./customer-projects.scss'],
    standalone: true,
    imports: [ToolbarComponent, ScrollbarComponent, ProjectStateFilterComponent, EmptyStateComponent, FormsModule, CommonModule, NexusModule, NgbTooltipModule, MoneyShortPipe, PermissionsDirective, HotkeyDirective, CdkDropList, CdkDrag]
})
export class CustomerProjects implements AfterViewInit, OnInit {

    projects: Project[] = []
    coParticipatedProjects: Project[] = []
    filter_prepared  = Project.fromJson({ var: { visible: true }, ...ProjectState.stateFor(1) })
    filter_running   = Project.fromJson({ var: { visible: true }, ...ProjectState.stateFor(2) })
    filter_finished  = Project.fromJson({ var: { visible: true }, ...ProjectState.stateFor(3) })
    filter_failed    = Project.fromJson({ var: { visible: true }, ...ProjectState.stateFor(4) })
    filter_alternate = Project.fromJson({ var: { visible: true }, ...ProjectState.stateFor(5) })
    collapsedProjects = new Set<string>()
    allDropListIds: string[] = []

    @ViewChild(ProjectStateFilterComponent) stateFilter: ProjectStateFilterComponent

    projectService = inject(ProjectService)
    parent = inject(CustomerDetailGuard)
    router = inject(Router)
    cdr = inject(ChangeDetectorRef)

    ngOnInit() {
        this.parent.onChange.subscribe(() => {
            this.reload()
        })
    }

    ngAfterViewInit() {
        this.reload()
    }
    reload() {
        if (!this.stateFilter) return
        const filters = this.stateFilter.getFilters()
        filters.withParents = true
        this.projectService.indexForCompany(this.parent.current, filters).subscribe((data: Project[]) => {
            data.forEach((_: Project) => {
                _.var.subprojects = []
                _.var.total = 0
                _.var.has_circular_dependency = false
            })

            // Detect circular dependencies
            const hasCircularDependency = (projectId: string, visited: Set<string> = new Set()): boolean => {
                if (visited.has(projectId)) return true
                visited.add(projectId)
                const project = data.find(p => p.id === projectId)
                if (project?.project_id) {
                    return hasCircularDependency(project.project_id, new Set(visited))
                }
                return false
            }

            data.forEach((_: Project) => {
                if (_.project_id && hasCircularDependency(_.id)) {
                    _.var.has_circular_dependency = true
                }
            })

            data.forEach((_: Project) => {
                if (_.project_id && !_.var.has_circular_dependency) {
                    const a = data.find((p: Project) => p.id === _.project_id)
                    a?.var.subprojects.push(_)
                    if (!a) {
                        console.warn('unknown base project', _.project_id, _.name)
                        _.project_id = ""
                    }
                }
            })
            data = data.filter((_: Project) => !_.project_id || _.var.has_circular_dependency)
            const recurse = (_: Project[]) => {
                _.forEach(item => {
                    recurse(item.var.subprojects)
                    item.var.total = item.net + item.var.subprojects.reduce((a: number, b: Project) => a + b.var.total, 0)
                    item.var.latest = moment.max(item.time_created(), ...item.var.subprojects.map((a: Project) => a.time_created()))
                })
            }
            recurse(data)
            this.projects = data.sort((a: Project, b: Project) => b.var.latest.diff(a.var.latest, 'seconds'))

            // Build list of all drop list IDs for cross-list dragging
            this.allDropListIds = []
            const collectIds = (items: Project[]) => {
                items.forEach(item => {
                    this.allDropListIds.push('drop-' + item.id)
                    if (item.var.subprojects?.length) {
                        collectIds(item.var.subprojects)
                    }
                })
            }
            collectIds(this.projects)
        })

        // Load co-participated projects
        this.projectService.indexCoParticipatedProjects(this.parent.current, filters).subscribe((data: Project[]) => {
            data.forEach((_: Project) => {
                _.var.subprojects = []
                _.var.total = 0
                _.var.has_circular_dependency = false
            })

            // Detect circular dependencies
            const hasCircularDependency = (projectId: string, visited: Set<string> = new Set()): boolean => {
                if (visited.has(projectId)) return true
                visited.add(projectId)
                const project = data.find(p => p.id === projectId)
                if (project?.project_id) {
                    return hasCircularDependency(project.project_id, new Set(visited))
                }
                return false
            }

            data.forEach((_: Project) => {
                if (_.project_id && hasCircularDependency(_.id)) {
                    _.var.has_circular_dependency = true
                }
            })

            data.forEach((_: Project) => {
                if (_.project_id && !_.var.has_circular_dependency) {
                    const a = data.find((p: Project) => p.id === _.project_id)
                    a?.var.subprojects.push(_)
                    if (!a) {
                        console.warn('unknown base project', _.project_id, _.name)
                        _.project_id = ""
                    }
                }
            })
            data = data.filter((_: Project) => !_.project_id || _.var.has_circular_dependency)
            const recurse = (_: Project[]) => {
                _.forEach(item => {
                    recurse(item.var.subprojects)
                    item.var.total = item.net + item.var.subprojects.reduce((a: number, b: Project) => a + b.var.total, 0)
                    item.var.latest = moment.max(item.time_created(), ...item.var.subprojects.map((a: Project) => a.time_created()))
                })
            }
            recurse(data)
            this.coParticipatedProjects = data.sort((a: Project, b: Project) => b.var.latest.diff(a.var.latest, 'seconds'))
        })
    }

    getConnectedDropLists = () => this.allDropListIds
    onDragStarted = () => document.body.classList.add('project-dragging')
    onDragEnded = () => document.body.classList.remove('project-dragging')

    onDropOnProject(event: CdkDragDrop<Project[]>, targetProject: Project) {
        const draggedProject = event.item.data as Project
        if (draggedProject.id !== targetProject.id) {
            this.makeSubproject(draggedProject, targetProject)
        }
    }

    onAddProject = () => this.projectService.addProject(this.parent.current.id).subscribe((x: any) => this.router.navigate(['/projects/' + x.id]))

    toggleCollapse(project: Project) {
        if (this.collapsedProjects.has(project.id)) {
            this.collapsedProjects.delete(project.id)
        } else {
            this.collapsedProjects.add(project.id)
        }
    }

    isCollapsed = (project: Project) => this.collapsedProjects.has(project.id)


    makeSubproject(draggedProject: Project, targetProject: Project) {
        console.log('makeSubproject called:', {
            dragged: draggedProject.name,
            draggedCurrentParent: draggedProject.project_id,
            target: targetProject.name,
            targetId: targetProject.id
        })

        if (this.wouldCreateCircularDependency(draggedProject.id, targetProject.id)) {
            console.log('Blocked: would create circular dependency')
            return
        }

        if (draggedProject.project_id === targetProject.id) {
            console.log('Blocked: already a subproject of this parent')
            return
        }

        console.log('Updating project_id to:', targetProject.id)
        this.projectService.update(draggedProject.id, { project_id: targetProject.id }).subscribe(() => {
            console.log('Update successful, reloading...')
            this.reload()
        })
    }

    wouldCreateCircularDependency(projectId: string, newParentId: string): boolean {
        if (projectId === newParentId) return true

        const findProject = (id: string): Project | undefined => {
            const search = (projects: Project[]): Project | undefined => {
                for (const p of projects) {
                    if (p.id === id) return p
                    const found = search(p.var.subprojects || [])
                    if (found) return found
                }
                return undefined
            }
            return search(this.projects)
        }

        let current = findProject(newParentId)
        while (current) {
            if (current.id === projectId) return true
            current = current.project_id ? findProject(current.project_id) : undefined
        }
        return false
    }
}