import { Injectable } from '@angular/core';
import { Dictionary } from '@constants/constants';
import { Project } from './project.model';
import { Framework } from './framework.model';
import { FrameworkLatest } from './framework-latest.model';
import { PdfCreationType } from '@enums/PdfCreationType';
import { map, Observable, of } from 'rxjs';
import { NexusHttpService } from '../http/http.nexus';
import { Company } from '../company/company.model';
import { NxGlobal } from '@app/nx/nx.global';
import { TInvoicing } from '@app/projects/id/project-invoicing/project-invoicing.component';
import { Milestone } from '@models/milestones/milestone.model';
import { Task } from '@models/tasks/task.model';
import { Serializable } from '@models/serializable';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { MilestonesResponse, ConvertResponse, ParticipatingCompany, PredictionStats, QuoteAcceptancePrediction } from '@models/api-response';

/** A tracker project url resolved back to the NEXUS project + plugin link that map to it. */
export interface ProjectPluginLinkResolution {
    url: string;
    pluginLinkId: string;
    project: Project;
}

@Injectable({ providedIn: 'root' })
export class ProjectService extends NexusHttpService<Project> {
    public apiPath = 'projects';
    override readonly model = Project;

    showForPath = (path: string, filters?: Dictionary) => this.show(path.split('/')[1], filters);
    /** Model 2 actionable output: running budget-based projects predicted to overrun, highest risk first. Powers widget-overrun-risk. */
    indexOverrunRisk = () => this.aget('projects/overrun-risk');
    assigned = (id: string) => this.get(`projects/${id}/assigned`);
    addProject = (customerId: string, name: string = 'New Project') => this.post(`companies/${customerId}/projects`, { name: name });
    addMilestone = (id: string) => this.post(`projects/${id}/milestones`, {});
    indexMilestones = (id: string) => this.get<MilestonesResponse>(`projects/${id}/milestones`);
    createMilestone = (projectId: string, data: Dictionary): Observable<Milestone> => this.post(`projects/${projectId}/milestones`, data, Milestone);
    createTaskForProject = (projectId: string, data: Dictionary): Observable<Task> => this.post(`projects/${projectId}/tasks`, data, Task);
    convertInvoiceItemsToMilestones = (projectId: string) => this.post<ConvertResponse>(`projects/${projectId}/convert-invoice-items-to-milestones`);
    wipeMilestones = (projectId: string) => this.delete(`projects/${projectId}/milestones/wipe-board`, {}, Object);
    linkMilestoneToInvoiceItem = (milestoneId: string, invoiceItemId: string) => this.post(`milestones/${milestoneId}/invoice-items/${invoiceItemId}`, {});
    predictionStats = (_: Project) => this.get<PredictionStats>(`projects/${_.id}/invoice-items/stats`, {});
    /** On-demand only — never cached/stored, see App\ML\ProjectQuoteModel. Powers the quote-acceptance card in project-invoicing (quote view). */
    showQuoteAcceptancePrediction = (_: Project) => this.get<QuoteAcceptancePrediction>(`projects/${_.id}/quote-acceptance-prediction`, {});

    moveRegularItemsToCustomer = (_: Project) => this.put(`projects/${_.id}/move-regular-to-customer`);
    moveSupportToCustomer = (_: Project) => this.put(`projects/${_.id}/move-support-to-customer`, {}, Object);
    makePdf = (parent: Serializable, type: PdfCreationType = PdfCreationType.Preview) => this.getFile(parent.apiPathWithId() + '/pdf', { type: type });

    indexMissingGit = () => this.aget('projects/missing-git', {}, Project);
    /** Resolves a handful of tracker project urls back to their NEXUS project, instead of listing every project the user has. */
    resolveProjectsByPluginLinkUrls = (urls: string[]): Observable<ProjectPluginLinkResolution[]> => {
        if (!urls.length) return of([]);
        return this.post('projects/resolve-plugin-link-urls', { urls }, Object).pipe(
            map((rows: Dictionary[]) => rows.map((row): ProjectPluginLinkResolution => ({ url: String(row['url']), pluginLinkId: String(row['plugin_link_id']), project: Project.fromJson(row['project']) }))),
        );
    };
    indexPaginated = (filters?: Dictionary) => this.paginate(this.apiPath, filters);
    indexForCompany = (company: Company, filters?: Dictionary): Observable<Project[]> => this.aget(`companies/${company.id}/projects`, filters);
    indexCoParticipatedProjects = (company: Company, filters?: Dictionary): Observable<Project[]> => this.aget(`companies/${company.id}/co-participated-projects`, filters);
    indexQuoteDescriptions = (project: Project): Observable<string[]> => this.aget<string>(`projects/${project.id}/quote-descriptions`, {});
    indexFrameworks = (): Observable<Framework[]> => this.aget('projects/frameworks', {}, Framework);
    indexLatestFrameworks = (): Observable<FrameworkLatest[]> => this.aget('projects/frameworks/latest', {}, FrameworkLatest);
    indexReporting = (params: Dictionary) => this.aget('projects/reporting', params, Project);
    /** All "Default" (feature) invoice items regardless of billing status - unlike the invoice_items shipped with the project, this still includes already-invoiced items. */
    indexFeatures = (project: Project): Observable<InvoiceItem[]> => this.aget(`projects/${project.id}/features`, {}, InvoiceItem);

    makeInvoice(project: Project, type: TInvoicing, success?: () => unknown, draft = false) {
        // Map TInvoicing enum to backend stage: PartialInvoice→2, SupportInvoice→1, FinalInvoice→0
        const stageMap: Partial<Record<TInvoicing, number>> = {
            [TInvoicing.PartialInvoice]: 2,
            [TInvoicing.SupportInvoice]: 1,
            [TInvoicing.FinalInvoice]: 0,
        };
        const stage = stageMap[type] ?? 0;
        const params: Dictionary = draft ? { type: stage, draft: 1 } : { type: stage };
        // A draft is never persisted, so it must always be downloaded from the response — the
        // "view stored invoice" path (getBlob + navigate) has nothing to show afterwards.
        const download = NxGlobal.global.user!.getFloatParam('INVOICE_DOWNLOAD', 1);
        if (draft || download === 1) {
            this.getFile(`projects/${project.id}/invoice`, params, success);
        } else {
            this.getBlob(`projects/${project.id}/invoice`, params).subscribe({ next: () => success?.() });
        }
    }

    indexConnectionProjects = (project: Project) => this.aget<ParticipatingCompany>(`projects/${project.id}/connection-projects`, {});
    storeConnectionProject = (project: Project, connectionId: number) => this.post(`projects/${project.id}/connection-projects`, { connection_id: connectionId }, Object);
    destroyConnectionProject = (project: Project, connectionProjectId: number) => this.delete(`projects/${project.id}/connection-projects/${connectionProjectId}`, {}, Object);
}
