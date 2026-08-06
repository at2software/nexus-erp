import { Type } from '@models/_core/hydrate';
import { Serializable } from '@models/_core/serializable';
import { User } from '../user/user.model';
import { Vacation } from './vacation.model';
import { MODAL } from '@models/_core/modal-registry';
import { NxAction, NxActionType } from '@models/_core/nx.actions';
import { Model } from '@constants/model/type-discriminators';
@Model('VacationGrant')
export class VacationGrant extends Serializable {
    static API_PATH = (): string => 'vacation_grants';

    expires_at: string = '';
    name: string = '';
    amount: number = 0;
    user_id: string = '';

    protected override buildActions(): NxAction[] {
        return [
            {
                title: $localize`:@@i18n.common.delete:delete`,
                interrupt: { service: MODAL.confirm, args: { message: $localize`:@@i18n.vacation.reallyDeleteThisGrant:really delete this grant?`, title: $localize`:@@i18n.common.attention:attention` } },
                action: () => this.delete(),
                type: NxActionType.Destructive,
                group: true,
                hotkey: 'CTRL+DELETE',
                roles: 'admin',
            },
        ];
    }

    @Type(()=>Vacation) vacations!: Vacation[];

    remainingHours = () => this.amount + this.vacations.reduce((a, b) => a + b.delta(), 0);
    remainingDays = (_: User) => this.remainingHours() / _.getAverageHpd();

    #countsTowardBalance = (v: Vacation) => [1, 3].includes(v.state);

    chartMin(): number {
        let running = this.amount;
        let min = 0;
        this.vacations.forEach((v) => {
            if (this.#countsTowardBalance(v)) {
                running += v.amount;
                if (running < min) min = running;
            }
        });
        return Math.min(min, -this.amount * 0.2);
    }

    chartMax(): number {
        return this.amount * 1.1;
    }

    chartDxFor(vacation: Vacation): number {
        let running = this.amount;
        const idx = this.vacations.findIndex((v) => v.id === vacation.id);
        for (let i = idx + 1; i < this.vacations.length; i++) {
            if (this.#countsTowardBalance(this.vacations[i])) running += this.vacations[i].amount;
        }
        return running;
    }

    remainingHoursAfter(vacation: Vacation): number {
        return this.chartDxFor(vacation) + (this.#countsTowardBalance(vacation) ? vacation.amount : 0);
    }
}
