import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NexusHttpService } from '../http/http.nexus';
import { Milestone } from './milestone.model';
import { Project } from '../project/project.model';
import { mapVar, serialize } from '@constants/rxjs-operators';

export interface ProjectMilestoneGroup {
    project: Project;
    milestones: Milestone[];
}

export class TReturnUserMilestones {
    milestones: {milestone: Milestone}[];
    projects: Project[];
}
@Injectable({ providedIn: 'root' })
export class MilestoneService extends NexusHttpService<Milestone> {
    public apiPath = 'milestones'
    public TYPE = () => Milestone

    indexUserMilestones = (userId: string) => this.aget(`users/${userId}/milestones`, {}, TReturnUserMilestones)
    indexPmMilestones = (userId: string) => this.aget(`users/${userId}/pm-milestones`, {}).pipe(
        mapVar(['company_name', 'estimated_hours', 'milestone_count'], 'projectsNoCoverage'),
        serialize('projectsNoCoverage', Project)
    );

    indexOverview = () => this.aget('milestones/overview', {}).pipe(
        serialize('unassigned', Milestone),
        serialize('overdue', Milestone),
        serialize('noWorkload', Milestone),
        mapVar(['company_name', 'estimated_hours', 'milestone_hours', 'deviation', 'milestone_count', 'missing_coverage'], 'projects'),
        serialize('projects', Project)
    );

    update = (id: number, data: object): Observable<Milestone> => {
        return this.put(`milestones/${id}`, data, Milestone);
    }

    show = (id: number): Observable<Milestone> => {
        return this.get(`milestones/${id}`, {}, Milestone);
    }

    destroy = (id: number): Observable<any> => {
        return this.delete(`milestones/${id}`);
    }

    addDependency = (milestoneId: number, dependsOnId: number): Observable<any> => {
        return this.post(`milestones/${milestoneId}/dependencies`, { depends_on: dependsOnId });
    }

    removeDependency = (milestoneId: number, dependsOnId: number): Observable<any> => {
        return this.delete(`milestones/${milestoneId}/dependencies`, { depends_on: dependsOnId });
    }

    removeDependencies = (milestoneId: number, dependsOnIds: number[]): Observable<any> => {
        return this.post(`milestones/${milestoneId}/dependencies/bulk/delete`, { depends_on_ids: dependsOnIds });
    }

    reorder = (milestones: { id: number, position: number }[]): Observable<any> => {
        return this.put(`milestones/reorder`, { milestones });
    }
}