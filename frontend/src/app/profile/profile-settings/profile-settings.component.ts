import { Component, inject } from '@angular/core';
import { GlobalService } from '@models/global.service';
import { InputSwitchGroupComponent } from '@shards/input-group/input-switch.component';

import { InputSettingsGroupComponent } from '@shards/input-group/input-group.component';

@Component({
    selector: 'profile-settings',
    templateUrl: './profile-settings.component.html',
    styleUrls: ['./profile-settings.component.scss'],
    standalone: true,
    imports: [InputSwitchGroupComponent, InputSettingsGroupComponent]
})
export class ProfileSettingsComponent {
    global = inject(GlobalService)
    tab: number = 0
    show = (_: number) => { this.tab = _ }
}
