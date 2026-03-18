import { Injectable } from "@angular/core";
import { NexusHttpService } from "@models/http/http.nexus";
import { LeadSource } from "./lead_source.model";

@Injectable({ providedIn: 'root' })
export class LeadSourceService extends NexusHttpService<LeadSource> {
    public apiPath = 'lead_sources'
    store = (name:string) => this.post('lead_sources', {name: name})
}