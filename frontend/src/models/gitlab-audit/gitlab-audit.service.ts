import { Injectable } from '@angular/core';
import { NexusHttpService } from '../http/http.nexus';
import { GitlabAuditProject } from './gitlab-audit-project.model';

@Injectable({ providedIn: 'root' })
export class GitlabAuditService extends NexusHttpService<GitlabAuditProject> {
    apiPath = 'gitlab-audit';
    TYPE = () => GitlabAuditProject;

    index = () => this.aget(this.apiPath, {}, GitlabAuditProject);
    store = (data: any) => this.post(this.apiPath, data);
    update = (id: string | number, data: any) => this.put(`${this.apiPath}/${id}`, data);
    destroy = (id: string | number) => this.delete(`${this.apiPath}/${id}`);
}
