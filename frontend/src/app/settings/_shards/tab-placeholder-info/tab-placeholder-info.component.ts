import { ActivityTabComponent } from '@activity/activity-tab.component';
import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
    selector: 'tab-placeholder-info',
    templateUrl: './tab-placeholder-info.component.html',
    imports: [ActivityTabComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TabPlaceholderInfoComponent {}
