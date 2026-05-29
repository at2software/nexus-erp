import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { GlobalService } from '@models/global.service';
import { InputSwitchGroupComponent } from '@shards/input-group/input-switch.component';
import { InputSettingsGroupComponent } from '@shards/input-group/input-settings-group.component';

@Component({
    selector: 'profile-settings',
    templateUrl: './profile-settings.component.html',
    styleUrls: ['./profile-settings.component.scss'],
    standalone: true,
    imports: [InputSwitchGroupComponent, InputSettingsGroupComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSettingsComponent {
    global = inject(GlobalService);
    tab = signal(0);
    show = (n: number) => this.tab.set(n);
}
