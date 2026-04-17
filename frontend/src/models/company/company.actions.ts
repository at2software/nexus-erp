import { NxAction, NxActionType } from "src/app/nx/nx.actions"
import { Company } from "./company.model"
import { NxGlobal } from "src/app/nx/nx.global"

export function getCompanyActions(self: Company): NxAction[] {
    return [
        { title: $localize`:@@i18n.common.open:open`, action: () => self.navigate(self.frontendUrl()) },
        ...NxGlobal.clipboardActions(self),
        { title: $localize`:@@i18n.common.edit:edit`, action: () => self.navigate(`/customers/${self.id}/staff`) },
        NxGlobal.deleteAction(self, 'Really delete this company?', { roles: 'admin' }),
        {
            title: $localize`:@@i18n.common.setDeprecated:set deprecated`,
            on: () => !self.is_deprecated,
            group: true,
            type: NxActionType.Destructive,
            action: () => self.update({ is_deprecated: true }),
            roles: 'admin'
        },
        ...self.markerActions(),
    ]
}
