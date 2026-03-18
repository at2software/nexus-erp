import { Injectable } from '@angular/core';
import { Dictionary } from '../../constants/constants';
import { Project } from './project.model';
import { Framework } from './framework.model';
import { FrameworkLatest } from './framework-latest.model';
import { PdfCreationType } from 'src/enums/PdfCreationType';
import { Observable } from 'rxjs/internal/Observable';
import { NexusHttpService } from '../http/http.nexus';
import { Company } from '../company/company.model';
import { NxGlobal } from '@app/nx/nx.global';
import { TInvoicing } from '@app/projects/id/project-invoicing/project-invoicing.component';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { Milestone } from '@models/milestones/milestone.model';
import { Serializable } from '@models/serializable';

@Injectable({ providedIn: 'root' })
export class ProjectService extends NexusHttpService<Project> {
    public apiPath = 'projects'
    public TYPE = () => Project

    show = (id: string, filters?: Dictionary) => this.get(`projects/${id}`, filters)
    showForPath = (path: string, filters?: Dictionary) => this.show(path.split('/')[1], filters)
    assigned = (id: string) => this.get(`projects/${id}/assigned`)
    addProject = (customerId: string, name: string = 'New Project') => this.post(`companies/${customerId}/projects`, { name: name })
    update = (id: string, data: object) => this.put('projects/' + id, data)
    addMilestone = (id: string) => this.post(`projects/${id}/milestones`, {})
    indexMilestones = (id: string): Observable<any> => this.get(`projects/${id}/milestones`, {})
    createMilestone = (projectId: string, data: any): Observable<Milestone> => {
        return this.post(`projects/${projectId}/milestones`, data, Milestone)
    }
    createTaskForProject = (projectId: string, data: any): Observable<any> => {
        return this.post(`projects/${projectId}/tasks`, data, Object)
    }
    convertInvoiceItemsToMilestones = (projectId: string) => this.post(`projects/${projectId}/convert-invoice-items-to-milestones`, {}, Object)
    wipeMilestones = (projectId: string) => this.delete(`projects/${projectId}/milestones/wipe-board`, {}, Object)
    linkMilestoneToInvoiceItem = (milestoneId: string, invoiceItemId: string) => this.post(`milestones/${milestoneId}/invoice-items/${invoiceItemId}`, {})
    predictionStats = (_: Project) => this.get(`projects/${_.id}/invoice-items/stats`, {}, Object)

    moveRegularItemsToCustomer = (_: Project) => this.put(`projects/${_.id}/move-regular-to-customer`)
    moveSupportToCustomer = (_:Project) => this.put(`projects/${_.id}/move-support-to-customer`, {}, Object)
    makePdf = (parent: Serializable, type: PdfCreationType = PdfCreationType.Preview) => this.getFile(parent.getApiPathWithId() + '/pdf', { type: type })

    index = (filters?: Dictionary): Observable<Project[]> => { return this.paginate(this.apiPath, filters) }
    indexForCompany = (company: Company, filters?: Dictionary): Observable<Project[]> => { return this.aget(`companies/${company.id}/projects`, filters) }
    indexCoParticipatedProjects = (company: Company, filters?: Dictionary): Observable<Project[]> => { return this.aget(`companies/${company.id}/co-participated-projects`, filters) }
    indexQuoteDescriptions = (project:Project) => this.aget(`projects/${project.id}/quote-descriptions`, {}, String)
    indexFrameworks = (): Observable<Framework[]> => this.aget('projects/frameworks', {}, Framework)
    indexLatestFrameworks = (): Observable<FrameworkLatest[]> => this.aget('projects/frameworks/latest', {}, FrameworkLatest)
    indexReporting = (params:any) => this.aget('projects/reporting', params, Project)
    
    makeInvoice(project:Project, type:TInvoicing, success?: () => unknown) {
        const download = NxGlobal.global.user!.getFloatParam('INVOICE_DOWNLOAD', 1)
        if (download === 1) {
            this.getFile(`projects/${project.id}/invoice`, { type: type }, success)
        } else {
            this.get(`projects/${project.id}/invoice`, { type: type }).subscribe(success)
        }
    }
    makeInstallmentInvoice(project:Project, items:InvoiceItem[], success?: () => unknown) {
        const download = NxGlobal.global.user!.getFloatParam('INVOICE_DOWNLOAD', 1)
        if (download === 1) {
            this.postFile(`projects/${project.id}/installment-invoice`, { items: items }, success)
        } else {
            const cleanItems = items.map(item => item.snapshotData)
            this.post(`projects/${project.id}/installment-invoice`, { items: cleanItems }).subscribe(success)
        }
    }

    indexConnectionProjects = (project: Project) => this.aget(`projects/${project.id}/connection-projects`, {}, Object)
    storeConnectionProject = (project: Project, connectionId: number) => this.post(`projects/${project.id}/connection-projects`, { connection_id: connectionId }, Object)
    destroyConnectionProject = (project: Project, connectionProjectId: number) => this.delete(`projects/${project.id}/connection-projects/${connectionProjectId}`, {}, Object)
} 
