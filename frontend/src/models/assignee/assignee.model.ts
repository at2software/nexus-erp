import { AssignmentService } from '@models/assignee/assignment.service';
import { CompanyContact } from '../company/company-contact.model';
import { Serializable } from '../serializable';
import { User } from '../user/user.model';
import { PluginInstance } from '../http/plugin.instance';
import { getAssigneeActions } from './assignee.actions';
import { TypeFromClass, Model } from '@constants/type-discriminators';
import { computed, Type } from '@angular/core';

export const I18N_REMOVE_FROM_TEAM = $localize`:@@i18n.project.removeFromTeam:remove from team`;

@Model('Assignee')
export class Assignee extends Serializable {
    static API_PATH = (): string => 'assignments';
    SERVICE = AssignmentService;

    doubleClickAction: number = 0;
    actions = getAssigneeActions(this);

    role_id: number = 0;
    duration: string = '';
    assignee_id: string = '';
    parent_id: string = '';
    user_id: string = '';
    company_contact_id: string = '';
    company_id: string = '';
    hours_planned: number = 0;
    hours_weekly: number = 0;
    avg_hpd: number = 0;

    @TypeFromClass() assignee!: CompanyContact | User;

    getUser = () => this.assignee as User;

    setRole = (role: number) => {
        this.role_id = role;
        this.update();
    };

    getName = computed(() => this.assignee?.getName() || '');

    isUser = () => this.assignee?.class === 'User';
    role = () => ({ 1: 'Developer', 2: 'Project Manager', 3: 'Designer', 4: 'Customer' }[this.role_id] ?? '');
    route() {
        if (this.apiPath() == 'companies') return '/customers/' + this.id;
        return '/' + this.apiPath() + '/' + this.id;
    }

    // Generic plugin integration - delegates to assignee
    canLinkTo = <T extends PluginInstance>(pluginType: Type<T>): boolean => {
        return this.assignee?.canLinkToInstance(pluginType) ?? false;
    };

    linkTo = <T extends PluginInstance, S extends PluginInstance = T>(pluginType: Type<T>, subPluginType?: Type<S>) => {
        this.assignee?.linkToInstance(pluginType, subPluginType);
    };

    getLinkablePlugins = () => (this.assignee as { getLinkableRootInstances?: () => PluginInstance[] })?.getLinkableRootInstances?.() ?? [];
    linkToPlugin = (instance: PluginInstance) => (this.assignee as { linkToPlugin?: (i: PluginInstance) => void })?.linkToPlugin?.(instance);

    static newU = (u: User) => Assignee.fromJson({ assignee: u, user_id: u.id });
    static newC = (u: CompanyContact) => Assignee.fromJson({ assignee: u, company_contact_id: u.id });
}
