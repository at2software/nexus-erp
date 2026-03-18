import { NxAction } from "src/app/nx/nx.actions"
import { User } from "./user.model"

export function getUserActions(self: User): NxAction[] {
    return [
        {
            title: $localize`:@@i18n.marketing.unsubscribe_from_initiative:unsubscribe from initiative`, context: 'initiative_subscriber', action: () => {
                const context = (self as any).__nxContext;
                if (context?.component && context?.initiative) {
                    context.component.unsubscribeFromInitiative(self.id);
                }
            }
        },
        { title: $localize`:@@i18n.common.retire:retire`, on: () => !self.is_retired, context: '!initiative_subscriber', action: () => self.update({ is_retired: true }).subscribe(), roles: 'hr' },
        {
            title: $localize`:@@i18n.common.assignToGroup:assign to group...`, context: '!initiative_subscriber', roles: 'admin', children: [
                { title: $localize`:@@i18n.common.admin:admin`, action: () => self.update({ user_group: 'admin' }).subscribe() },
                { title: $localize`:@@i18n.common.projectManager:project manager`, action: () => self.update({ user_group: 'project_manager' }).subscribe() },
                { title: $localize`:@@i18n.common.developer:developer`, action: () => self.update({ user_group: 'developer' }).subscribe() },
                { title: $localize`:@@i18n.common.noUserGroup:no user group`, action: () => self.update({ user_group: null }).subscribe() }
            ]
        }
    ]
}
