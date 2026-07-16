import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { PluginConfigModalComponent } from './plugin-config-modal/plugin-config-modal.component';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { ConfirmationService } from '@app/_modals/modal-confirm/confirmation.service';
import { NxGlobal } from '@app/nx/nx.global';
import { Encryption } from '@models/encryption/encryption.model';
import { GlobalService } from '@models/global.service';
import { PluginInstanceFactory } from '@models/http/plugin.instance.factory';
import { MantisPlugin } from '@models/http/plugin.mantis';
import { UserService } from '@models/user/user.service';
import { RsaSettingsEmptyComponent } from '@shards/rsa-settings/rsa-settings-empty.component';
import { SlicePipe } from '@angular/common';
import { NComponent } from '@shards/n/n.component';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { TabPluginsComponent } from '@activity/tab-plugins/tab-plugins.component';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { PluginEntry } from '@models/api-response';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-profile-plugins',
    templateUrl: './profile-plugins.component.html',
    imports: [RsaSettingsEmptyComponent, SlicePipe, NComponent, ToolbarComponent, TabPluginsComponent, NgbDropdownModule],
})
export class ProfilePluginsComponent {
    global = inject(GlobalService);
    factory = inject(PluginInstanceFactory);
    #userService = inject(UserService);
    #confirmationService = inject(ConfirmationService);
    #modalInput = inject(InputModalService);
    #modalService = inject(NgbModal);

    onLinkDelete = (_: Encryption) => {
        this.#confirmationService
            .confirm({
                title: $localize`:@@i18n.profile.deletePlugin:delete plugin`,
                message: $localize`:@@i18n.common.areYouSure:are you sure?`,
                btnOkText: $localize`:@@i18n.common.yes:yes`,
                btnCancelText: $localize`:@@i18n.common.no:no`,
            })
            .then(() => {
                NxGlobal.service.delete(`encryptions/${_.id}`).subscribe(() => this.global.reload());
            });
    };
    linkMyId = (_: Encryption) => {
        this.#modalInput.open('Your ID').then((response) => {
            _.update({ my_id: response!.text }).subscribe();
        });
    };

    getMantisProjects = (_: Encryption) => (this.factory.instanceFor(_) as MantisPlugin).projects ?? [];

    #makeEntry = (p: Encryption, type: string, displayName: string): PluginEntry => Object.assign(p, { type, displayName });

    // Get all plugin types with their configurations
    getAllPlugins = (): PluginEntry[] => [
        ...this.factory.getPluginEncryptionsOfType('mattermost').map((p) => this.#makeEntry(p, 'mattermost', 'Mattermost')),
        ...this.factory.getPluginEncryptionsOfType('git').map((p) => this.#makeEntry(p, 'git', 'GitLab')),
        ...this.factory.getPluginEncryptionsOfType('mantis').map((p) => this.#makeEntry(p, 'mantis', 'MantisBT')),
        ...this.factory.getPluginEncryptionsOfType('slack').map((p) => this.#makeEntry(p, 'slack', 'Slack')),
        ...this.factory.getPluginEncryptionsOfType('local_ai').map((p) => this.#makeEntry(p, 'local_ai', 'LocalAI Proxy')),
        ...this.factory.getPluginEncryptionsOfType('nexus').map((p) => this.#makeEntry(p, 'nexus', 'NEXUS')),
    ];

    // Get plugin status text for badge
    getPluginStatusText = (plugin: PluginEntry): string => {
        try {
            if (plugin.type === 'nexus') return '';
            if (!plugin?.value?.url) return 'not configured';
            const originalEncryption = this.factory.getPluginEncryptionsOfType(plugin.key || plugin.type).find((e) => e.id === plugin.id);
            if (!originalEncryption) return 'unknown';
            const instance = this.factory.instanceFor(originalEncryption);
            return (instance?.state || 'unknown').toLowerCase();
        } catch (_error) {
            return 'error';
        }
    };

    // Check if plugin has successfully connected (for badge styling)
    isPluginConnected = (plugin: PluginEntry): boolean => this.getPluginStatusText(plugin) === 'connected';

    // Open configuration modal for a plugin
    openPluginModal = (plugin: PluginEntry) => {
        const modalRef = this.#modalService.open(PluginConfigModalComponent, { size: 'lg' });
        modalRef.componentInstance.plugin = plugin;

        modalRef.result
            .then((result) => {
                if (result === 'delete') {
                    this.onLinkDelete(plugin);
                } else if (result === 'updated') {
                    this.global.reload();
                }
            })
            .catch(() => {
                // Modal dismissed - no action needed
            });
    };

    // Open modal for creating new plugin
    openNewPluginModal = (type: string, displayName: string) => {
        // Create a new plugin object with default values
        const defaultValues = this.#getDefaultValuesForPlugin(type);
        const newPlugin = {
            type: type,
            displayName: displayName,
            value: defaultValues,
            my_id: null,
            id: null, // New plugin has no ID yet
        };

        const modalRef = this.#modalService.open(PluginConfigModalComponent, { size: 'lg' });
        modalRef.componentInstance.plugin = newPlugin;
        modalRef.componentInstance.isNewPlugin.set(true);

        modalRef.result
            .then((result) => {
                if (result === 'save') {
                    // Save the new plugin
                    this.#onLinkAdded(type, newPlugin.value);
                }
                // Reload to refresh the display
                this.global.reload();
            })
            .catch(() => {
                // Modal dismissed - no action needed
            });
    };

    #getDefaultValuesForPlugin(type: string): Record<string, string> {
        switch (type) {
            case 'mattermost': return { url: '', team: '', token: '' };
            case 'git': return { url: '', token: '' };
            case 'mantis': return { url: '', token: '' };
            case 'slack': return { url: '', token: '' };
            case 'local_ai': return { url: '', login: '', password: '' };
            default: return {};
        }
    }

    #onLinkAdded = (key: string, object: Record<string, string>) => this.#userService.encrypt(key, object).subscribe((_) => this.global.reload());
    // Helper methods for template access to dynamic properties
    getPluginType = (plugin: PluginEntry): string => plugin.type;
    getPluginDisplayName = (plugin: PluginEntry): string => plugin.displayName;
}
