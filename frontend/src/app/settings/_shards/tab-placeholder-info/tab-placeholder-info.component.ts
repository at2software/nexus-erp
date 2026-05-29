import { ActivityTabComponent } from '@activity/activity-tab.component';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'tab-placeholder-info',
    templateUrl: './tab-placeholder-info.component.html',
    styleUrls: ['./tab-placeholder-info.component.scss'],
    standalone: true,
    imports: [ActivityTabComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabPlaceholderInfoComponent {}
