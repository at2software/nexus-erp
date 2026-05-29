import { Serializable } from '../serializable';
import { UserService } from './user.service';
import { NxAction } from '@app/nx/nx.actions';
import { getUserEmploymentActions } from './user-employment.actions';
import { Model } from '@constants/type-discriminators';

@Model('UserEmployment')
export class UserEmployment extends Serializable {
    static API_PATH = (): string => 'user_employments';

    user_id: string = '';
    is_active: boolean = false;
    is_time_based: boolean = false;
    started_at: string = '';
    description: string = '';
    mo: number = 0;
    tu: number = 0;
    we: number = 0;
    th: number = 0;
    fr: number = 0;
    sa: number = 0;
    su: number = 0;
    hpw: number = 0;

    SERVICE = UserService;

    actions: NxAction[] = getUserEmploymentActions(this);

    apiPath = (): any => 'users/' + this.user_id + '/employment';
    hpwArray = () => [this.mo, this.tu, this.we, this.th, this.fr, this.sa, this.su];

    calculateRequiredHoursForMonth(monthStr: string): number {
        const [year, month] = monthStr.split('-').map(Number);
        const daysInMonth = new Date(year, month, 0).getDate();
        let totalRequiredHours = 0;
        const dailyNames = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'] as const;
        const hasDailyHours = dailyNames.slice(1, 6).some((d) => this[d] != null);
        if (hasDailyHours) {
            for (let day = 1; day <= daysInMonth; day++) {
                const dayName = dailyNames[new Date(year, month - 1, day).getDay()];
                const dailyHours = this[dayName] as number;
                if (dailyHours) totalRequiredHours += dailyHours;
            }
        } else if (this.hpw) {
            totalRequiredHours = (this.hpw / 5) * this.countWorkingDaysInMonth(year, month - 1);
        }
        return totalRequiredHours;
    }

    countWorkingDaysInMonth(year: number, month: number): number {
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        let workingDays = 0;
        for (let day = 1; day <= daysInMonth; day++) {
            const dow = new Date(year, month, day).getDay();
            if (dow >= 1 && dow <= 5) workingDays++;
        }
        return workingDays;
    }
}
