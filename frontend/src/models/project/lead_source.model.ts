import { Serializable } from "@models/serializable";
import { LeadSourceService } from "./lead_source.service";
import { getLeadSourceActions } from "./lead_source.actions";

export class LeadSource extends Serializable {

    static API_PATH = (): string => 'lead_sources'

    name:string
    
    SERVICE = LeadSourceService;

    doubleClickAction: number = 0
    actions = getLeadSourceActions(this)

    get icon(): string { return 'assets/icons/lead_source.png' }
    set icon(_:any) { 
        // do nothing
    }
}
