import { Component, inject } from '@angular/core';

import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { PluginLink } from '@models/pluginLink/plugin-link.model';
import { PluginInstanceFactory } from '@models/http/plugin.instance.factory';
import { NexusModule } from '@app/nx/nexus.module';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

@Component({
    selector: 'project-detail-settings-plugin-links',
    templateUrl: './project-detail-settings-plugin-links.component.html',
    styleUrls: ['./project-detail-settings-plugin-links.component.scss'],
    standalone: true,
    imports: [NgbTooltipModule, NexusModule, EmptyStateComponent]
})
export class ProjectDetailSettingsPluginLinksComponent {
    parent = inject(ProjectDetailGuard);
    factory = inject(PluginInstanceFactory);

    get pluginLinks(): PluginLink[] {
        return this.parent.current?.plugin_links || [];
    }
}
