import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { GlobalService } from '@models/global.service';
import { tracked } from '@constants/tracked';
import { ProfileVacationWidgetComponent } from '../widgets/profile-vacation-widget/profile-vacation-widget.component';
import { HrVacationComponent } from '@app/hr/hr-vacation/hr-vacation.component';

@Component({
    selector: 'app-profile-vacation',
    templateUrl: './profile-vacation.component.html',
    styleUrls: ['./profile-vacation.component.scss'],
    standalone: true,
    imports: [ProfileVacationWidgetComponent, HrVacationComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileVacationComponent {
    #global = inject(GlobalService);
    readonly user = tracked(computed(() => this.#global.user));
}
