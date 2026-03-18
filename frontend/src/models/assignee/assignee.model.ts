import { AssignmentService } from "src/models/assignee/assignment.service";
import { CompanyContact } from "../company/company-contact.model";
import { Serializable } from "../serializable";
import { User } from "../user/user.model";
import { VcardClass } from "../vcard/VcardClass";
import { IHasFoci } from "@models/focus/hasFoci.interface";
import { Type } from "@angular/core";
import { PluginInstance } from "../http/plugin.instance";
import { getAssigneeActions } from "./assignee.actions";
import { Accessor } from "@constants/accessor";

export const I18N_REMOVE_FROM_TEAM = $localize`:@@i18n.project.removeFromTeam:remove from team`
export type T_ASSIGNEE_TARGET = IHasFoci
export class Assignee extends Serializable {

    static API_PATH = (): string => 'assignments'
    SERVICE = AssignmentService

    setRole = (role: number) => { this.role_id = role; this.update(); }
    doubleClickAction: number = 0
    actions = getAssigneeActions(this)

    role_id            : number = 0
    duration           : string = ''
    assignee_id        : string = ''
    parent_id          : string = ''
    user_id            : string = ''
    company_contact_id: string  = ''
    company_id         : string = ''
    hours_planned      :number  = 0
    hours_weekly       :number  = 0
    avg_hpd            :number  = 0

    @Accessor((val: any) => {
        if (!val) return val
        if (val.class==='User') return User.fromJson(val)
        if (val.class==='CompanyContact') return CompanyContact.fromJson(val)
        return val
    }) assignee: VcardClass

    getUser = () => this.assignee as User
    
    static newU = (u: User) => Assignee.fromJson({ assignee: u, user_id: u.id })
    static newC = (u: CompanyContact) => Assignee.fromJson({ assignee: u, company_contact_id: u.id })

    set name(val) { this.assignee.name = val }
    get name(): string { return this.assignee.name }

    isUser = () => this.assignee?.class === 'User'
    role(): string {
        switch (this.role_id) {
            case 1: return 'Developer';
            case 2: return 'Project Manager';
            case 3: return 'Designer';
            case 4: return 'Customer';
        }
        return '';
    }
    route() {
        if (this.getApiPath() == 'companies') return '/customers/' + this.id
        return '/' + this.getApiPath() + '/' + this.id
    } 

    // Generic plugin integration - delegates to assignee
    canLinkTo = <T extends PluginInstance>(pluginType: Type<T>): boolean => {
        if (!this.assignee?.card) return false
        return this.assignee.canLinkToInstance(pluginType)
    }

    linkTo = <T extends PluginInstance, S extends PluginInstance = T>(pluginType: Type<T>, subPluginType?: Type<S>) => {
        if (this.assignee) {
            this.assignee.linkToInstance(pluginType, subPluginType)
        }
    }

    // Legacy wrapper methods for backward compatibility - use lazy imports to avoid circular dependencies
    canLinkToMantis = (): boolean => {
        return this.assignee ? this.assignee.canLinkToPluginByName('mantis') : false;
    }
    linkToMantisUser = async () => {
        const { MantisPlugin } = await import("../http/plugin.mantis");
        this.linkTo(MantisPlugin);
    }
    canLinkToGit = (): boolean => {
        return this.assignee ? this.assignee.canLinkToPluginByName('git') : false;
    }
    linkToGitUser = async () => {
        const { GitLabPlugin } = await import("../http/plugin.gitlab");
        this.linkTo(GitLabPlugin);
    }
    canLinkToMattermost = (): boolean => {
        return this.assignee ? this.assignee.canLinkToPluginByName('mattermost') : false;
    }
    linkToMattermostUser = async () => {
        const { MattermostPlugin } = await import("../http/plugin.mattermost");
        this.linkTo(MattermostPlugin);
    }
}
