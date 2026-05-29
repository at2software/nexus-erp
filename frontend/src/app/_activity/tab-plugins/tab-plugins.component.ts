import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GlobalService } from '@models/global.service';
import { PluginInstance } from '@models/http/plugin.instance';
import { PluginInstanceFactory } from '@models/http/plugin.instance.factory';
import { Project } from '@models/project/project.model';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { PluginLinkService } from '@models/pluginLink/plugin-link.service';
import { ActivityTabComponent } from '@activity/activity-tab.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { RsaSettingsEmptyComponent } from '@shards/rsa-settings/rsa-settings-empty.component';
import { RsaSettingsComponent } from '@shards/rsa-settings/rsa-settings.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Nx } from '@app/nx/nx.directive';
import { NComponent } from '@shards/n/n.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'activity-tab-plugins',
    templateUrl: './tab-plugins.component.html',
    styleUrls: ['./tab-plugins.component.scss'],
    standalone: true,
    imports: [ActivityTabComponent, ScrollbarComponent, RsaSettingsEmptyComponent, RsaSettingsComponent, NgbTooltipModule, Nx, NComponent],
})
export class TabPluginsComponent {
    readonly #global = inject(GlobalService);
    readonly #factory = inject(PluginInstanceFactory);
    readonly #pluginLinkService = inject(PluginLinkService);
    readonly #modalService = inject(InputModalService);

    readonly project = signal<Project | undefined>(undefined);
    readonly user = computed(() => this.#global.user);
    readonly encryptionsValid = computed(() => this.#global.encryptionsValid());
    readonly pluginEncryptions = computed(() => this.#factory.getPluginEncryptions());

    constructor() {
        this.#global.onRootObjectSelected.pipe(takeUntilDestroyed()).subscribe((obj) => {
            this.project.set(obj instanceof Project ? obj : undefined);
        });
    }

    instanceFor = (p: any) => this.#factory.instanceFor(p);

    onNewPluginLink(_: PluginInstance) {
        this.#modalService
            .open(_.newPluginText)
            .then((response) => {
                if (response && 'text' in response) {
                    this.#pluginLinkService.store(_.toPluginLink(response!.text), this.project()).subscribe((_) => {
                        this.project()?.plugin_links.push(_);
                    });
                }
            })
            .catch();
    }

    onNewPluginChannel(_: PluginInstance) {
        this.#pluginLinkService.createChannel(_.toPluginLink(''), this.project()).subscribe((_) => {
            this.project()?.plugin_links.push(_);
        });
    }
}
