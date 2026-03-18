import { Component, OnInit, inject } from '@angular/core';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { GlobalService } from 'src/models/global.service';
import { User } from 'src/models/user/user.model';
import { UserService } from 'src/models/user/user.service';
import { ProfileVacationWidgetComponent } from '../widgets/profile-vacation-widget/profile-vacation-widget.component';
import { ColorPickerDirective } from 'ngx-color-picker';
import { FormsModule } from '@angular/forms';
import { LiveSharingService } from 'src/models/live-sharing.service';

import { HrWorkloadComponent } from '@app/hr/hr-workload/hr-workload.component';
import { HrWorkloadHeatmapComponent } from '@app/hr/hr-workload-heatmap/hr-workload-heatmap.component';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'profile-dashboard',
    templateUrl: './profile-dashboard.component.html',
    styleUrls: ['./profile-dashboard.component.scss'],
    standalone: true,
    imports: [ScrollbarComponent, ProfileVacationWidgetComponent, ColorPickerDirective, FormsModule, HrWorkloadComponent, HrWorkloadHeatmapComponent, RouterModule]
})
export class ProfileDashboardComponent implements OnInit {

    user: User
    global               = inject(GlobalService)
    #userService         = inject(UserService)
    #liveSharingService  = inject(LiveSharingService)
    workloadTitle        = $localize`:@@i18n.common.workload:workload`
    liveSharingEnabled   = false

    ngOnInit() {
        this.user = this.global.user!
        this.liveSharingEnabled = this.#liveSharingService.featureEnabled$.value
        this.reload()
    }
    reload()  {
        this.#userService.showVacationStats(this.user).subscribe()
    }
    saveColor(e:any) {
        this.user.update({color:e}).subscribe()
    }
    toggleLiveSharing(event: Event) {
        const enabled = (event.target as HTMLInputElement).checked
        this.liveSharingEnabled = enabled
        this.#liveSharingService.toggleFeature(enabled)
    }

}
