import { Injectable } from '@angular/core';
import { Dictionary } from '@constants/constants';
import { NexusHttpService } from '../http/http.nexus';
import { GitlabAuditProject } from './gitlab-audit-project.model';

@Injectable({ providedIn: 'root' })
export class GitlabAuditService extends NexusHttpService<GitlabAuditProject> {
    apiPath = 'gitlab-audit';
    override readonly model = GitlabAuditProject;

    store = (data: Dictionary) => this.post(this.apiPath, data);
}
