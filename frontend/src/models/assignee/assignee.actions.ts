import { NxAction, NxActionType } from '@app/nx/nx.actions';
import { Assignee, I18N_REMOVE_FROM_TEAM } from './assignee.model';
import { CompanyContact } from '../company/company-contact.model';
import { NxGlobal } from '@app/nx/nx.global';
import { Project } from '../project/project.model';

export function getAssigneeActions(self: Assignee): NxAction[] {
    return [
        {
            title: $localize`:@@i18n.common.edit:edit`,
            action: () => {
                if (self.isUser()) {
                    self.navigateTo(`/hr/${self.user_id}`);
                } else {
                    self.navigateTo(`/customers/${(self.assignee as CompanyContact).company_id}/contacts/${(self.assignee as CompanyContact).id}`);
                }
            },
        },
        {
            title: $localize`:@@i18n.projects.makeProjectManager:make project manager`,
            group: false,
            on: () => self.isUser(),
            action: () => NxGlobal.service.put(`projects/${self.parent_id}`, { project_manager_id: self.assignee_id }).subscribe(() => {
                const project = NxGlobal.getCurrentRoot();
                if (project instanceof Project) {
                    project.project_manager = self.getUser();
                    project.project_manager_id = self.assignee_id;
                    project.projectManagerChanged.next();
                }
            }),
        },
        {
            title: $localize`:@@i18n.plugins.linkToPluginUser:link to plugin user`,
            group: true,
            on: () => self.getLinkablePlugins().length > 0,
            children: () => self.getLinkablePlugins().map((inst: any) => ({
                title: `link to ${inst.icon()} user`,
                action: () => self.linkToPlugin(inst),
            })),
        },
        {
            title: I18N_REMOVE_FROM_TEAM,
            group: true,
            label: 'CTRL+DELETE',
            action: () => self.delete(),
            type: NxActionType.Destructive,
            hotkey: 'CTRL+DELETE',
            roles: 'user',
        },
        {
            title: $localize`:@@i18n.companies.changeRoleTo:change role to...`,
            on: () => (self.isUser() ? false : true),
            children: [
                { title: $localize`:@@i18n.common.developer:developer`, label: 'CTRL+1', action: () => self.setRole(1), on: () => self.role_id != 1 },
                { title: $localize`:@@i18n.common.projectManager:project manager`, label: 'CTRL+2', action: () => self.setRole(2), on: () => self.role_id != 2 },
                { title: $localize`:@@i18n.common.designer:designer`, label: 'CTRL+3', action: () => self.setRole(3), on: () => self.role_id != 3 },
            ],
        },
    ];
}
