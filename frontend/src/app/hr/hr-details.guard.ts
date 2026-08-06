import { inject, Service } from '@angular/core';
import { DetailGuard } from '@guards/detail.guard';
import { User } from '@models/user/user.model';
import { UserService } from '@models/user/user.service';
import { HrTeamService } from './hr-team/hr-team.service';

@Service()
export class HrDetailGuard extends DetailGuard<User> {
    service = inject(UserService);
    srv = inject(HrTeamService);
    observable = (id: string) => this.service.show(id);
    onLoaded = (_: User) => {
        this.srv.setUser(_);
        return Promise.resolve();
    };
}
