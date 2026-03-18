import { AutoWrapArray } from "@constants/autowrap";
import { Serializable } from "../serializable"
import type { User } from "../user/user.model";
import { VacationGrantService } from "./vacation-grant.service";
import type { Vacation } from "./vacation.model";
import { ModalConfirmComponent } from "@app/_modals/modal-confirm/modal-confirm.component";
import { NxActionType } from "@app/nx/nx.actions";
export class VacationGrant extends Serializable {

    static API_PATH = (): string => 'vacation_grants'
    SERVICE = VacationGrantService

    expires_at: string
    name      : string
    amount    : number
    user_id   : string

    actions = [{
            title: $localize`:@@i18n.common.delete:delete`,
            interrupt: { service: ModalConfirmComponent, args: { message: $localize`:@@i18n.vacation.reallyDeleteThisGrant:really delete this grant?`, title: $localize`:@@i18n.common.attention:attention` } },
            action: () => this.delete(),
            type: NxActionType.Destructive,
            group: true,
            hotkey: 'CTRL+DELETE',
            roles: 'admin'
        },
    ]

    @AutoWrapArray('Vacation') vacations:Vacation[]

    remainingHours = () => this.amount + this.vacations.reduce((a, b) => a + b.delta(), 0)
    remainingDays = (_:User) => this.remainingHours() / _.getAverageHpd()
}