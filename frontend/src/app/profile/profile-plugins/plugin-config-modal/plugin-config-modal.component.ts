import { Component, OnInit, inject } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { ConfirmationService } from '@app/_modals/modal-confirm/confirmation.service';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { PluginInstanceFactory } from 'src/models/http/plugin.instance.factory';
import { MantisPlugin } from 'src/models/http/plugin.mantis';
import { IAIPlugin } from 'src/models/ai/ai.plugin.interface';
import { PluginInstance } from 'src/models/http/plugin.instance';

import { FormsModule } from '@angular/forms';

@Component({
    selector: 'plugin-config-modal',
    templateUrl: './plugin-config-modal.component.html',
    styleUrls: ['./plugin-config-modal.component.scss'],
    standalone: true,
    imports: [FormsModule]
})
export class PluginConfigModalComponent implements OnInit {
    plugin: any;
    isNewPlugin: boolean = false;
    availableModels: any[] = [];
    isLoadingModels: boolean = false;
    isTestingConnection: boolean = false;
    factory = inject(PluginInstanceFactory);
    activeModal = inject(NgbActiveModal);
    #confirmationService = inject(ConfirmationService);
    #inputModalService = inject(InputModalService);

    ngOnInit() {
        // Ensure plugin.value exists and has default structure
        if (this.plugin && (!this.plugin.value || typeof this.plugin.value !== 'object')) {
            this.plugin.value = this.#getDefaultValuesForType(this.plugin.type);
        }

        // Load models for LocalAI plugins that are already configured
        if (this.plugin?.type === 'local_ai' && !this.isNewPlugin && this.plugin.value?.url) {
            this.loadAvailableModels();
        }
    }

    #getDefaultValuesForType(type: string): any {
        switch (type) {
            case 'mattermost': return { url: '', team: '', token: '' };
            case 'git'       : return { url: '', token: '' };
            case 'mantis'    : return { url: '', token: '', filterId: undefined };
            case 'slack'     : return { url: '', token: '' };
            case 'local_ai'  : return { url: '', login: '', password: '', model: '' };
            default          : return {};
        }
    }

    onDelete = () => {
        this.#confirmationService.confirm({
            title        : $localize`:@@i18n.profile.deletePlugin:delete plugin`,
            message      : $localize`:@@i18n.common.areYouSure:are you sure?`,
            btnOkText    : $localize`:@@i18n.common.yes:yes`,
            btnCancelText: $localize`:@@i18n.common.no:no`
        }).then(() => {
            // The parent component will handle the actual deletion
            this.activeModal.close('delete');
        });
    }

    onLinkMyId = () => {
        this.#inputModalService.open('Your ID').then(response => {
            if (response?.text) {
                this.plugin.update({ my_id: response.text }).subscribe();
            }
        });
    }

    getMantisProjects = () => {
        if (!this.plugin || this.isNewPlugin || !this.plugin.value?.url) return [];
        try {
            return ((this.factory.instanceFor(this.plugin)) as MantisPlugin).projects ?? [];
        } catch {
            return [];
        }
    }

    getMantisConnectionStatus = (): string => {
        if (!this.plugin || this.isNewPlugin || !this.plugin.value?.url) return 'not configured';
        try {
            const encryption = this.factory.getPluginEncryptionsOfType('mantis').find(p => p.id === this.plugin.id);
            if (!encryption) return 'unknown';
            return this.factory.instanceFor(encryption)?.state || 'unknown';
        } catch {
            return 'error';
        }
    }

    close = () => this.activeModal.close()

    save = () => {
        if (this.isNewPlugin) {
            // For new plugins, parent component handles creation
            this.activeModal.close('save');
        } else {
            // For existing plugins, find the original encryption object
            const originalEncryption = this.factory.getPluginEncryptions().find(e => e.id === this.plugin.id);

            if (!originalEncryption) return;

            // Update the original encryption's value with our changes
            originalEncryption.value = { ...this.plugin.value };

            // Now call update on the original encryption object
            originalEncryption.update().subscribe({
                next: (updatedPlugin: any) => {
                    // Update local plugin data with server response (already decrypted)
                    this.plugin.value = updatedPlugin.value;

                    // Clear plugin instance cache so it recreates with new config
                    if (this.plugin.value?.url && this.factory.instances[this.plugin.value.url]) {
                        delete this.factory.instances[this.plugin.value.url];
                    }

                    this.activeModal.close('updated');
                },
                error: (error: any) => {
                    console.error('Failed to update plugin:', error);
                }
            });
        }
    }

    loadAvailableModels = () => {
        if (!this.plugin || this.plugin.type !== 'local_ai' || !this.plugin.value?.url) {
            console.warn('Cannot load models: missing plugin data or URL');
            return;
        }

        // For new plugins, we can't test connection until they're saved
        if (this.isNewPlugin) {
            console.warn('Cannot test connection for new plugin - please save first');
            return;
        }

        // Check if this is a proper Encryption object or we need to find it
        let encryption = this.plugin;
        if (!this.plugin.key) {
            // This might be a spread object, find the original encryption
            const localAIPlugins = this.factory.getPluginEncryptionsOfType('local_ai');
            encryption = localAIPlugins.find(p => p.id === this.plugin.id);
            if (!encryption) {
                console.error('Could not find original encryption object for plugin:', this.plugin);
                return;
            }
        }

        try {
            const aiPlugin = this.factory.instanceFor(encryption) as IAIPlugin & PluginInstance;

            if (!aiPlugin) {
                console.warn('Could not create plugin instance');
                return;
            }

            if (!aiPlugin.IAIPluginProperty) {
                console.warn('Plugin does not implement IAIPlugin interface');
                return;
            }

            if (aiPlugin.state !== 'connected') {
                console.warn('LocalAI plugin not connected, state:', aiPlugin.state);
                return;
            }

            this.isLoadingModels = true;

            aiPlugin.listModels().subscribe({
                next: (models) => {
                    // Sort models alphabetically by name or id
                    this.availableModels = models.sort((a, b) => {
                        const nameA = (a.name || a.id || '').toLowerCase();
                        const nameB = (b.name || b.id || '').toLowerCase();
                        return nameA.localeCompare(nameB);
                    });
                    this.isLoadingModels = false;

                    // Set default model if none selected (use first alphabetically sorted model)
                    if (!this.plugin.value.model && this.availableModels.length > 0) {
                        this.plugin.value.model = this.availableModels[0].id;
                    }
                },
                error: (error) => {
                    console.error('Failed to load models:', error);
                    this.isLoadingModels = false;
                    this.availableModels = [];
                }
            });
        } catch (error) {
            console.error('Error getting plugin instance:', error);
            this.isLoadingModels = false;
        }
    }

    onLocalAIConnectionTest = () => {
        if (!this.plugin?.value?.url) return;

        if (this.factory.instances[this.plugin.value.url]) {
            delete this.factory.instances[this.plugin.value.url];
        }

        setTimeout(() => this.loadAvailableModels(), 100);
    }

    onMantisConnectionTest = () => {
        if (!this.plugin?.value?.url || !this.plugin?.value?.token || this.isNewPlugin) return;

        let encryption = this.plugin;
        if (!this.plugin.key) {
            encryption = this.factory.getPluginEncryptionsOfType('mantis').find(p => p.id === this.plugin.id);
            if (!encryption) return;
        }

        this.isTestingConnection = true;

        try {
            if (this.factory.instances[this.plugin.value.url]) {
                delete this.factory.instances[this.plugin.value.url];
            }

            if (encryption && 'state' in encryption) {
                (encryption as any).state = 'idle';
            }

            const mantisPlugin = this.factory.instanceFor(encryption) as MantisPlugin;
            if (!mantisPlugin) {
                this.isTestingConnection = false;
                return;
            }

            const connectionTimeout = setTimeout(() => {
                if (this.isTestingConnection) this.isTestingConnection = false;
            }, 10000);

            const checkState = () => {
                if (mantisPlugin.state === 'connected') {
                    clearTimeout(connectionTimeout);
                    this.isTestingConnection = false;
                    this.plugin = { ...this.plugin };
                } else if (mantisPlugin.state === 'connection fail') {
                    clearTimeout(connectionTimeout);
                    this.isTestingConnection = false;
                } else if (mantisPlugin.state === 'connecting') {
                    setTimeout(checkState, 1000);
                }
            };

            setTimeout(checkState, 500);

            mantisPlugin.init.subscribe({
                next: () => {
                    clearTimeout(connectionTimeout);
                    this.isTestingConnection = false;
                    this.plugin = { ...this.plugin };
                }
            });

        } catch {
            this.isTestingConnection = false;
        }
    }

}