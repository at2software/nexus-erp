import { Injectable, inject } from "@angular/core"
import { DetailGuard } from "src/guards/detail.guard"
import { User } from "src/models/user/user.model"
import { UserService } from "src/models/user/user.service"
import { HrTeamService } from "./hr-team/hr-team.service"

@Injectable({ providedIn: 'root' })
export class HrDetailGuard extends DetailGuard<User> {
    service = inject(UserService)
    srv = inject(HrTeamService)
    observable = (id:string) => this.service.show(id)
    onLoaded = (_: User) => {
        this.srv.setUser(_)
        return Promise.resolve()
    }
}