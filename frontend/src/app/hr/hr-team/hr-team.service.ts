import { Injectable } from "@angular/core";
import { NxGlobal } from "@app/nx/nx.global";
import { User } from "@models/user/user.model";
import { ReplaySubject } from "rxjs";

@Injectable({ providedIn: 'root' })
export class HrTeamService {
    #lastUser?: User
    onUserChange = new ReplaySubject<User>(1)

    getUserId() {
        if (!this.#lastUser) {
            this.#lastUser = NxGlobal.global.user!
        }
        return this.#lastUser!.id
    }

    getUser(): User | undefined {
        if (!this.#lastUser) {
            this.#lastUser = NxGlobal.global.user!
        }
        return this.#lastUser
    }
    
    setUser(_: User) {
        this.#lastUser = _
        this.onUserChange.next(_)
    }
}