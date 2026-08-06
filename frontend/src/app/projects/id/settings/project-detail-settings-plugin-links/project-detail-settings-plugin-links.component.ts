import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { tracked } from '@constants/tracked';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { PluginLink } from '@models/plugin-link/plugin-link.model';
import { PluginInstanceFactory } from '@models/http/plugins/plugin.instance.factory';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { StackedTableDirective } from '@directives/stacked-table.directive';

@Component({
    selector: 'project-detail-settings-plugin-links',
    templateUrl: './project-detail-settings-plugin-links.component.html',
    styleUrls: ['./project-detail-settings-plugin-links.component.scss'],
    imports: [StackedTableDirective, NgbTooltipModule, Nx, NComponent, EmptyStateComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectDetailSettingsPluginLinksComponent {
    parent = inject(ProjectDetailGuard);

    readonly object = tracked(this.parent.object);
    factory = inject(PluginInstanceFactory);

    readonly pluginLinks = computed<PluginLink[]>(() => this.parent.object()?.plugin_links || []);
}
