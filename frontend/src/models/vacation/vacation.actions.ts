import { NxAction, NxActionType } from "src/app/nx/nx.actions"
import { Vacation } from "./vacation.model"
import { NxGlobal } from "src/app/nx/nx.global"
import { ModalConfirmComponent } from "@app/_modals/modal-confirm/modal-confirm.component"

export function getVacatisingleActionResolveds(self: Vacation): NxAction[] {
    return [
        {
            title: $localize`:@@i18n.common.open:open`,
            on: () => self.state < Vacation.STATE_SICK,
            action: () => self.navigate(self.frontendUrl()!)
        },
        {
            title: $localize`:@@i18n.common.revoke:revoke`,
            group: true,
            on: () => (self.state === Vacation.STATE_REQUESTED || self.state === Vacation.STATE_APPROVED) && self.time_started().startOf('day').isAfter(new Date()),
            action: () => NxGlobal.service.put(`vacations/${self.id}/revoke`, {}).subscribe()
        },
        {
            title: $localize`:@@i18n.common.approve:approve`,
            group: true,
            on: () => (self.state < Vacation.STATE_SICK) && (self.state == Vacation.STATE_REQUESTED),
            action: () => self.approve()
        },
        {
            title: $localize`:@@i18n.common.reject:reject`,
            group: true,
            type: NxActionType.Destructive,
            on: () => (self.state < Vacation.STATE_SICK) && (self.state == Vacation.STATE_REQUESTED),
            action: () => self.deny()
        },
        {
            title: $localize`:@@i18n.common.acknowledge:acknowledge`,
            group:true,
            type: NxActionType.Destructive,
            on:()=>(self.state === Vacation.STATE_SICK) && self.hasVacationPermissions(),
            action: () => self.acknowledge().subscribe(),
        },
        {
            title: $localize`:@@i18n.common.delete:delete`,
            interrupt: { service: ModalConfirmComponent, args: { message: $localize`:@@i18n.vacation.reallyDeleteThisVacation:really delete this vacation?`, title: $localize`:@@i18n.common.attention:attention` } },
            action: () => self.delete(),
            type: NxActionType.Destructive,
            group: true,
            hotkey: 'CTRL+DELETE',
            on: () => self.state < Vacation.STATE_SICK,
            roles: 'admin'
        },
    ]
}
