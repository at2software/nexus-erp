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

    // States that count toward the running balance (approved + sick leave)
    #countsTowardBalance = (v: Vacation) => [1, 3].includes(v.state)

    chartMin(): number {
        let running = this.amount
        let min = 0
        this.vacations.forEach(v => {
            if (this.#countsTowardBalance(v)) {
                running += v.amount
                if (running < min) min = running
            }
        })
        return Math.min(min, -this.amount * 0.2)
    }

    chartMax(): number {
        return this.amount * 1.1
    }

    chartDxFor(vacation: Vacation): number {
        let running = this.amount
        const idx = this.vacations.findIndex(v => v.id === vacation.id)
        for (let i = idx + 1; i < this.vacations.length; i++) {
            if (this.#countsTowardBalance(this.vacations[i])) running += this.vacations[i].amount
        }
        return running
    }

    remainingHoursAfter(vacation: Vacation): number {
        return this.chartDxFor(vacation) + (this.#countsTowardBalance(vacation) ? vacation.amount : 0)
    }
}