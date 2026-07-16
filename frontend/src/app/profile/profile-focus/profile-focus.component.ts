import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { HrFocusTableComponent } from '@app/hr/hr-focus-table/hr-focus-table.component';
import { WidgetMyWorkingTimeComponent } from '@dashboard/widgets/widget-my-working-time/widget-my-working-time.component';
import { NgbProgressbarModule } from '@ng-bootstrap/ng-bootstrap';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { Focus } from '@models/focus/focus.model';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { GlobalService } from '@models/global.service';
import { UserService } from '@models/user/user.service';

@Component({
    selector: 'profile-focus',
    templateUrl: './profile-focus.component.html',
    imports: [ScrollbarComponent, WidgetMyWorkingTimeComponent, NgbProgressbarModule, AvatarComponent, DecimalPipe, HrFocusTableComponent, EmptyStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileFocusComponent {
    #global = inject(GlobalService);
    #userService = inject(UserService);

    readonly user = this.#global.user!;
    maxFocusSum = signal(0);
    focusSum = signal<Focus[]>([]);

    constructor() {
        this.#userService.showFoci30DStats(this.user).subscribe((r: Focus[]) => {
            for (const _ of r) _.fixParent();
            const sorted = r.sort((a, b) => b.duration - a.duration);
            this.focusSum.set(sorted);
            this.maxFocusSum.set(Math.max(...r.map((_) => _.duration)));
        });
    }
}
