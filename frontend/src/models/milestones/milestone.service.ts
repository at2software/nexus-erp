import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { NexusHttpService } from '../http/http.nexus';
import { Milestone } from './milestone.model';
import { MilestoneData, MilestonesGroup } from './api.milestone-group';
import { Project } from '@models/project/project.model';
import { Dictionary } from '@constants/constants';
import { mapVar, serialize } from '@constants/rxjs-operators';

/** PM milestone overview: per-project groups plus the PM's projects that lack milestone coverage. */
export type PmMilestones = Dictionary & {
    milestones: MilestonesGroup[];
    projectsNoCoverage: Project[];
};

@Injectable({ providedIn: 'root' })
export class MilestoneService extends NexusHttpService<Milestone> {
    public apiPath = 'milestones';
    override readonly model = Milestone;

    indexUserMilestones = (userId: string) => this.aget(`users/${userId}/milestones`, {}, MilestonesGroup);
    indexPmMilestones = (userId: string): Observable<PmMilestones> =>
        this.get<PmMilestones>(`users/${userId}/pm-milestones`).pipe(
            serialize('milestones', MilestonesGroup),
            mapVar(['company_name', 'estimated_hours', 'milestone_count'], 'projectsNoCoverage'),
            serialize('projectsNoCoverage', Project),
        );

    indexOverview = () => this.get('milestones/overview', {}, MilestoneData);

    linkInvoiceItem = (milestoneId: string, invoiceItemId: string): Observable<any> => {
        return this.post(`milestones/${milestoneId}/invoice-items/${invoiceItemId}`, {});
    };

    addDependency = (milestoneId: number, dependsOnId: number): Observable<any> => {
        return this.post(`milestones/${milestoneId}/dependencies`, { depends_on: dependsOnId });
    };

    removeDependency = (milestoneId: number, dependsOnId: number): Observable<any> => {
        return this.delete(`milestones/${milestoneId}/dependencies`, { depends_on: dependsOnId });
    };

    removeDependencies = (milestoneId: number, dependsOnIds: number[]): Observable<any> => {
        return this.post(`milestones/${milestoneId}/dependencies/bulk/delete`, { depends_on_ids: dependsOnIds });
    };

    reorder = (milestones: { id: number; position: number }[]): Observable<any> => {
        return this.put(`milestones/reorder`, { milestones });
    };
}
