import { DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { modelListResource } from '@models/http/model-resource';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { HrFocusTableComponent } from '@app/hr/hr-focus-table/hr-focus-table.component';
import { WidgetMyWorkingTimeComponent } from '@dashboard/widgets/widget-my-working-time/widget-my-working-time.component';
import { NgbProgressbarModule } from '@ng-bootstrap/ng-bootstrap';
import { AvatarComponent } from '@shards/avatar/avatar.component';
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

    readonly #foci30d = modelListResource(() => this.#userService.showFoci30DStats(this.user));
    readonly focusSum = computed(() => {
        const foci = [...this.#foci30d.value()];
        foci.forEach((_) => _.fixParent());
        return foci.sort((a, b) => b.duration - a.duration);
    });
    readonly maxFocusSum = computed(() => this.focusSum().first()?.duration ?? 0);
}
