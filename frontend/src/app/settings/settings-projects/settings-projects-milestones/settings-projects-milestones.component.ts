import { ChangeDetectionStrategy, Component } from '@angular/core';
import { InputSettingsGroupComponent } from '@shards/input-group/input-settings-group.component';

@Component({
    selector: 'settings-projects-milestones',
    templateUrl: './settings-projects-milestones.component.html',
    styleUrls: ['./settings-projects-milestones.component.scss'],
    standalone: true,
    imports: [InputSettingsGroupComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsProjectsMilestonesComponent {}
