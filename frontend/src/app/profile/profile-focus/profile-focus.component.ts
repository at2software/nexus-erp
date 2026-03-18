import { CommonModule } from '@angular/common';
import { Component, inject, OnInit } from '@angular/core';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { HrFocusTableComponent } from '@app/hr/hr-focus-table/hr-focus-table.component';
import { WidgetMyWorkingTimeComponent } from '@dashboard/widgets/widget-my-working-time/widget-my-working-time.component';
import { NgbProgressbarModule } from '@ng-bootstrap/ng-bootstrap';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { Focus } from 'src/models/focus/focus.model';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { GlobalService } from 'src/models/global.service';
import { User } from 'src/models/user/user.model';
import { UserService } from 'src/models/user/user.service';

@Component({
    selector: 'profile-focus',
    templateUrl: './profile-focus.component.html',
    styleUrls: ['./profile-focus.component.scss'],
    standalone: true,
    imports: [ScrollbarComponent, WidgetMyWorkingTimeComponent, NgbProgressbarModule, AvatarComponent, CommonModule, HrFocusTableComponent, EmptyStateComponent]
})
export class ProfileFocusComponent implements OnInit {

    user: User
    #global = inject(GlobalService)
    #userService = inject(UserService)

    maxFocusSum = 0
    focusSum:Focus[] = []

    ngOnInit() {
        this.user = this.#global.user!
        this.#userService.showFoci30DStats(this.user).subscribe((r:Focus[]) => {
            for (const _ of r) {
                _.fixParent()
            }
            this.focusSum = r.sort((a, b) => b.duration - a.duration)
            this.maxFocusSum = Math.max(...r.map(_ => _.duration))
        })
    }
}
