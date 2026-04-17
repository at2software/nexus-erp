import { NxAction, NxActionType } from "src/app/nx/nx.actions"
import { Task } from "./task.model"
import { NxGlobal } from "src/app/nx/nx.global"

export function getTaskActions(self: Task): NxAction[] {
    return [
        { title: $localize`:@@i18n.common.open:open`, action: () => self.httpService.open(self) },
        { title: $localize`:@@i18n.tasks.close:close`, on: () => self.state == 0, action: () => self.httpService.close(self), group: true, type: NxActionType.Destructive },
        { title: $localize`:@@i18n.tasks.reopen:reopen`, on: () => self.state == 1, action: () => self.httpService.reopen(self), group: true, type: NxActionType.Creative },
        { title: $localize`:@@i18n.tasks.assignToMe:assign to me`, action: () => self.httpService.assign(self, self.httpService.myUser()!), group: true },
        {
            title: $localize`:@@i18n.tasks.assignTo:assign to...`,
            on: () => self.httpService!.getUsers().length > 0,
            group: true,
            children: () => self.httpService!.getUsers().map(user => (
                {
                    title: user.name, action: () => self.httpService.assign(self, user), group: true
                })) ?? []
        },
        {
            title: $localize`:@@i18n.tasks.addLabel:add label...`,
            on: () => self.httpService!.getLabels().length > 0,
            group: true,
            children: () => self.httpService!.getLabels().map(_ => (
                { title: _.name, action: () => self.httpService.addLabel(self, _.name), group: true }
            )) ?? []
        },
        {
            title: $localize`:@@i18n.tasks.removeLabel:remove label...`, on: () => self.httpService!.getLabels().length > 0, group: true, children: () => self.httpService!.getLabels().map(_ => (
                { title: _.name, action: () => self.httpService.removeLabel(self, _.name), group: true }
            )) ?? []
        },
        NxGlobal.deleteAction(self, $localize`:@@i18n.tasks.reallyDeleteThisTask:really delete this task?`, { roles: 'admin', action: () => self.httpService.destroy(self) })
    ]
}
