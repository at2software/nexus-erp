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

}