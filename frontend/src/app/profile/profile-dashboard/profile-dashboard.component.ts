import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { GlobalService } from '@models/global.service';
import { UserService } from '@models/user/user.service';
import { ProfileVacationWidgetComponent } from '../widgets/profile-vacation-widget/profile-vacation-widget.component';
import { ColorPickerDirective } from 'ngx-color-picker';
import { FormsModule } from '@angular/forms';
import { LiveSharingService } from '@models/live-sharing.service';
import { HrWorkloadComponent } from '@app/hr/hr-workload/hr-workload.component';
import { HrWorkloadHeatmapComponent } from '@app/hr/hr-workload-heatmap/hr-workload-heatmap.component';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'profile-dashboard',
    templateUrl: './profile-dashboard.component.html',
    styleUrls: ['./profile-dashboard.component.scss'],
    standalone: true,
    imports: [ScrollbarComponent, ProfileVacationWidgetComponent, ColorPickerDirective, FormsModule, HrWorkloadComponent, HrWorkloadHeatmapComponent, RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileDashboardComponent {
    global = inject(GlobalService);
    #userService = inject(UserService);
    #liveSharingService = inject(LiveSharingService);

    readonly workloadTitle = $localize`:@@i18n.common.workload:workload`;
    readonly liveSharingEnabled = toSignal(this.#liveSharingService.featureEnabled$, { initialValue: false });

    constructor() {
        this.#userService.showVacationStats(this.global.user!).subscribe();
    }

    saveColor = (e: any) => this.global.user!.update({ color: e }).subscribe();
    toggleLiveSharing = (event: Event) => this.#liveSharingService.toggleFeature((event.target as HTMLInputElement).checked);
}
