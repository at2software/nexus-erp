import { NxAction } from "src/app/nx/nx.actions"
import { Cash } from "./cash.model"
import { NxGlobal } from "src/app/nx/nx.global"

export function getCashActions(self: Cash): NxAction[] {
    return [
        NxGlobal.deleteAction(self, $localize`:@@i18n.cash.reallyDeleteThisEntry:really delete this entry?`, { roles: 'financial' }),
    ]
}
