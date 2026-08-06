import { Service } from '@angular/core';
import { NexusHttpService } from '@models/http/http.nexus';
import { LeadSource } from './lead-source.model';

@Service()
export class LeadSourceService extends NexusHttpService<LeadSource> {
    public apiPath = 'lead_sources';
}
