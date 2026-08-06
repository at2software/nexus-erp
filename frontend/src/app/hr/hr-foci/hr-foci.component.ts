import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { tracked } from '@constants/tracked';
import { HrTeamService } from '../hr-team/hr-team.service';
import { HrFocusTableComponent } from '../hr-focus-table/hr-focus-table.component';

@Component({
    selector: 'hr-foci',
    templateUrl: './hr-foci.component.html',
    imports: [HrFocusTableComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HrFociComponent {
    #parent = inject(HrTeamService);

    readonly user = tracked(this.#parent.user);
}
