import { Serializable } from "../serializable";
import { UserService } from "./user.service";
import { NxAction } from "src/app/nx/nx.actions";
import { getUserEmploymentActions } from "./user-employment.actions";

export class UserEmployment extends Serializable {

	static API_PATH = ():string => 'user_employments'

    user_id      : string
    is_active    : boolean
    is_time_based: boolean
    started_at   : string
    description  : string
    mo           : number
    tu           : number
    we           : number
    th           : number
    fr           : number
    sa           : number
    su           : number
    hpw          : number

    SERVICE = UserService

    actions:NxAction[] = getUserEmploymentActions(this)
    
    getApiPath = (): any => 'users/' + this.user_id + '/employment'
    hpwArray = () => [this.mo, this.tu, this.we, this.th, this.fr, this.sa, this.su]

    calculateRequiredHoursForMonth(monthStr: string): number {
        const [year, month] = monthStr.split('-').map(Number)
        const daysInMonth = new Date(year, month, 0).getDate()
        let totalRequiredHours = 0
        const dailyNames = ['su', 'mo', 'tu', 'we', 'th', 'fr', 'sa'] as const
        const hasDailyHours = dailyNames.slice(1, 6).some(d => this[d] != null)
        if (hasDailyHours) {
            for (let day = 1; day <= daysInMonth; day++) {
                const dayName = dailyNames[new Date(year, month - 1, day).getDay()]
                const dailyHours = this[dayName] as number
                if (dailyHours) totalRequiredHours += dailyHours
            }
        } else if (this.hpw) {
            totalRequiredHours = (this.hpw / 5) * this.countWorkingDaysInMonth(year, month - 1)
        }
        return totalRequiredHours
    }

    countWorkingDaysInMonth(year: number, month: number): number {
        const daysInMonth = new Date(year, month + 1, 0).getDate()
        let workingDays = 0
        for (let day = 1; day <= daysInMonth; day++) {
            const dow = new Date(year, month, day).getDay()
            if (dow >= 1 && dow <= 5) workingDays++
        }
        return workingDays
    }

}