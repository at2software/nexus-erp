import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
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
import { Encryption } from '@models/encryption/encryption.model';
import { PluginLink } from '@models/pluginLink/plugin-link.model';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'activity-tab-plugins',
    templateUrl: './tab-plugins.component.html',
    imports: [ActivityTabComponent, ScrollbarComponent, RsaSettingsEmptyComponent, RsaSettingsComponent, NgbTooltipModule, Nx, NComponent],
})
export class TabPluginsComponent {
    readonly #global = inject(GlobalService);
    readonly #factory = inject(PluginInstanceFactory);
    readonly #pluginLinkService = inject(PluginLinkService);
    readonly #modalService = inject(InputModalService);
    readonly #destroyRef = inject(DestroyRef);

    readonly project = signal<Project | undefined>(undefined);
    readonly user = computed(() => this.#global.user);
    readonly encryptionsValid = computed(() => this.#global.encryptionsValid());
    readonly pluginEncryptions = computed(() => this.#factory.getPluginEncryptions());

    // Plugin instances are long-lived and cached by PluginInstanceFactory; their display fields
    // (getName(), getStateCss(), etc.) mutate in place once async connect()/connectSub() resolves.
    // Nothing else re-renders this component afterwards, so bump this signal off instance.init
    // to force re-evaluation of the template's getName()/getStateCss() reads under zoneless CD.
    readonly #connectBump = signal(0);
    readonly #subscribedInstances = new Set<PluginInstance>();

    constructor() {
        this.#global.onRootObjectSelected.pipe(takeUntilDestroyed()).subscribe((obj) => {
            this.project.set(obj instanceof Project ? obj : undefined);
        });
    }

    instanceFor = (p: Encryption | PluginLink): PluginInstance | undefined => {
        this.#connectBump();
        const instance = this.#factory.instanceFor(p);
        if (instance && !this.#subscribedInstances.has(instance)) {
            this.#subscribedInstances.add(instance);
            instance.init.pipe(takeUntilDestroyed(this.#destroyRef)).subscribe(() => this.#connectBump.update((v) => v + 1));
        }
        return instance;
    };

    onNewPluginLink(_: PluginInstance) {
        this.#modalService
            .open(_.newPluginText)
            .then((response) => {
                if (response && 'text' in response) {
                    this.#pluginLinkService.store(_.toPluginLink(response!.text), this.project()).subscribe((link) => {
                        this.project.update((p) => {
                            p?.plugin_links.push(link);
                            return p ? Object.assign(Object.create(Object.getPrototypeOf(p)), p) : p;
                        });
                    });
                }
            })
            .catch();
    }

    onNewPluginChannel(_: PluginInstance) {
        this.#pluginLinkService.createChannel(_.toPluginLink(''), this.project()).subscribe((link) => {
            this.project.update((p) => {
                p?.plugin_links.push(link);
                return p ? Object.assign(Object.create(Object.getPrototypeOf(p)), p) : p;
            });
        });
    }
}
