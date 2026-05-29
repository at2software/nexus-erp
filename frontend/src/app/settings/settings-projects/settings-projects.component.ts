import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { TabPlaceholderInfoComponent } from '@app/settings/_shards/tab-placeholder-info/tab-placeholder-info.component';

@Component({
    selector: 'app-settings-projects',
    templateUrl: './settings-projects.component.html',
    styleUrls: ['./settings-projects.component.scss'],
    standalone: true,
    imports: [ScrollbarComponent, RouterModule, TabPlaceholderInfoComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsProjectsComponent {}
