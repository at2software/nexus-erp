import { Service } from '@angular/core';
import { NexusHttpService } from '../http/http.nexus';
import { GitlabAuditProject } from './gitlab-audit-project.model';

@Service()
export class GitlabAuditService extends NexusHttpService<GitlabAuditProject> {
    apiPath = 'gitlab-audit';
    override readonly model = GitlabAuditProject;
}
