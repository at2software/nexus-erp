import { NxAction, NxActionType } from "src/app/nx/nx.actions"
import { Assignee, I18N_REMOVE_FROM_TEAM } from "./assignee.model"
import { CompanyContact } from "../company/company-contact.model"
import { NxGlobal } from "@app/nx/nx.global"

export function getAssigneeActions(self: Assignee): NxAction[] {
    return [
        {
            title: $localize`:@@i18n.common.edit:edit`, action: () => {
                if (self.isUser()) {
                    self.navigate(`/hr/${self.user_id}`)
                } else {
                    self.navigate(`/customers/${(self.assignee as CompanyContact).company_id}/contacts/${(self.assignee as CompanyContact).id}`)
                }
            }
        },
        {
            title: $localize`:@@i18n.projects.makeProjectManager:make project manager`,
            group: false,
            on: () => self.isUser(),
            action: () => NxGlobal.service.put(`projects/${self.parent_id}`, { project_manager_id: self.assignee_id })
        },
        {
            title: $localize`:@@i18n.mantis.link_to_mantisbt_user:link to MantisBT user`,
            group: true,
            action: () => self.linkToMantisUser(),
            on: () => self.canLinkToMantis()
        },
        {
            title: $localize`:@@i18n.git.link_to_gitlab_user:link to GitLab user`,
            group: true,
            action: () => self.linkToGitUser(),
            on: () => self.canLinkToGit()
        },
        {
            title: $localize`:@@i18n.mattermost.link_to_mattermost_user:link to Mattermost user`,
            group: true,
            action: () => self.linkToMattermostUser(),
            on: () => self.canLinkToMattermost()
        },
        {
            title: I18N_REMOVE_FROM_TEAM,
            group: true,
            label: 'CTRL+DELETE',
            action: () => self.delete(),
            type: NxActionType.Destructive,
            hotkey: 'CTRL+DELETE',
            roles: 'user'
        },
        {
            title: $localize`:@@i18n.companies.changeRoleTo:change role to...`, on: () => self.isUser() ? false : true, children: [
                { title: $localize`:@@i18n.common.developer:developer`, label: 'CTRL+1', action: () => self.setRole(1), on: () => self.role_id != 1 },
                { title: $localize`:@@i18n.common.projectManager:project manager`, label: 'CTRL+2', action: () => self.setRole(2), on: () => self.role_id != 2 },
                { title: $localize`:@@i18n.common.designer:designer`, label: 'CTRL+3', action: () => self.setRole(3), on: () => self.role_id != 3 },
            ]
        },
    ]
}
