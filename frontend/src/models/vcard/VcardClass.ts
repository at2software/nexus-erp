import { Color } from '@constants/Color';
import { Serializable } from '../serializable';
import { Vcard } from './Vcard';
import { NxGlobal } from '@app/nx/nx.global';
import type { PluginInstanceFactory } from '../http/plugin.instance.factory';
import { computed, signal, type Type } from '@angular/core';
import type { PluginInstance } from '../http/plugin.instance';
import { VcardRow } from './VcardRow';

let _pluginFactoryClass: any = null;
import('../http/plugin.instance.factory').then(({ PluginInstanceFactory }) => (_pluginFactoryClass = PluginInstanceFactory)).catch();

export abstract class VcardClass extends Serializable {

    getPersonal = (): VcardClass | undefined => this;

    __vcardExchangeString: string = '';
    #gender: string = '';
    get gender(): string { return this.#gender; }
    set gender(v: string) { this.#gender = v; }

    card = signal<Vcard|undefined>(undefined);
    getVcardString = computed(() => this.card()?.toString() ?? '');
    set vcard(val: string) { if (val) this.card.set(new Vcard(val)); }

    getName = computed(() => this.card()?.name || (this as any).name || '');

    static readonly #descAdr = ['post office box', 'apartment or suite number', 'street address', 'locality (e.g., city)', 'region (e.g., state or province)', 'postal code', 'country name'];
    static readonly #descN = ['Family Names', 'Given Names', 'Additional Names', 'Honorific Prefixes', 'Honorific Suffixes'];
    static readonly #SALUTATIONS: Record<string, Record<string, string>> = {
        en: { M: 'Mr.', F: 'Mrs.' },
        de: { M: 'Herr', F: 'Frau' },
    };
    static readonly #VCARD_ATTR_MAP: Record<string, string> = {
        mantis: 'X-NEXUS-MANTISBT',
        git: 'X-NEXUS-GIT',
        mattermost: 'X-NEXUS-MATTERMOST',
    };

    #getKeys = (key: string) => computed(() => this.getPersonal()?.card()?.get(key))();
    #getFirst = (key: string) => computed(() => this.#getKeys(key)?.first()?.vals ?? [])();
    #getFirstValue = (key: string, index: number, fallback: string = '') => computed(() => this.#getFirst(key)[index] ?? fallback)();

    familyName        = computed(() => this.#getFirstValue('N', 0));
    firstName         = computed(() => this.#getFirstValue('N', 1));
    honoraryPrefix    = computed(() => this.#getFirstValue('N', 3));
    honorarySuffix    = computed(() => this.#getFirstValue('N', 4));
    fullName          = computed(() => this.#getFirst('FN').join(''));
    url               = computed(() => this.#getKeys('URL')?.map((_) => _.vals[0]));
    role              = computed(() => this.#getFirst('ROLE').join(''));
    countryCode       = computed(() => this.#getFirstValue('ADR', 6));
    getFormality      = computed(() => this.#getFirstValue('X-FORMALITY', 0, 'formal'));
    getLang           = computed(() => this.#getFirstValue('X-LANG', 0, 'de'));
    css               = computed(() => Color.posToHex(parseInt(this.snapshot().id)));
    isEuropeanCountry = computed(() => NxGlobal.global.euCountries?.contains(this.countryCode() ?? '-x-'));

    salutation = computed(() => {
        const lang = this.#getFirstValue('X-LANG', 0, 'de');
        const fallback = VcardClass.#SALUTATIONS[lang]?.[this.gender] ?? '???';
        return this.#getFirstValue('N', 2, fallback);
    });

    // https://datatracker.ietf.org/doc/html/rfc6350#section-6.3.1
    descAdr = (index: number): string => VcardClass.#descAdr[index];

    // https://datatracker.ietf.org/doc/html/rfc6350#section-6.2.2
    descN = (index: number): string => VcardClass.#descN[index];

    #setVcardRow(key: string, value: string) {
        const personal = this.getPersonal();
        const existing = personal?.card()?.rows.find((r) => r.key === key);
        if (existing) {
            existing.vals[0] = value;
        } else {
            personal?.card()?.rows.push(VcardRow.fromString(`${key}:${value}`)!);
        }
    }

    setLang(value: string) { this.#setVcardRow('X-LANG', value); }
    setFormality(value: string) { this.#setVcardRow('X-FORMALITY', value); }

    getUserIdForPlugin = (attrName: string): string | undefined => this.card()?.first(attrName)?.val();
    hasLinkForPlugin = (attrName: string): boolean => !!this.getUserIdForPlugin(attrName);

    #getFactory = (): PluginInstanceFactory | null => {
        if (!_pluginFactoryClass) return null;
        try { return (NxGlobal.getService(_pluginFactoryClass) as PluginInstanceFactory) ?? null; }
        catch { return null; }
    };

    canLinkToPluginByName = (pluginKey: string): boolean => {
        const factory = this.#getFactory();
        if (!factory) return false;
        const vcardAttr = VcardClass.#VCARD_ATTR_MAP[pluginKey];
        if (!vcardAttr) return false;
        return factory.getPluginEncryptionsOfType(pluginKey).length > 0 && !this.hasLinkForPlugin(vcardAttr);
    };

    getLinkableRootInstances = (): PluginInstance[] => {
        const factory = this.#getFactory();
        if (!factory) return [];
        return factory.getPluginInstances().filter(inst =>
            inst.isRootInstance() &&
            !!inst.getUserSelectionModalPath() &&
            !this.hasLinkForPlugin(inst.getVcardAttributeName())
        );
    };

    canLinkToInstance = <T extends PluginInstance>(pluginType: Type<T>): boolean => {
        const factory = this.#getFactory();
        if (!factory) return false;
        const instances = factory.getRootPluginInstancesByConstructor(pluginType);
        if (instances.length === 0) return false;
        const sampleInstance = instances[0] as any;
        if (this.hasLinkForPlugin(sampleInstance.getVcardAttributeName())) return false;
        const currentProject = NxGlobal.global.currentRoot;
        if (currentProject) {
            const interfaceProperty = sampleInstance.getInterfacePropertyName();
            return factory.getInstances(currentProject, [interfaceProperty]).filter((_) => _ instanceof pluginType).length > 0;
        }
        return factory.getPluginEncryptionsOfType(sampleInstance.getPluginTypeName()).length > 0;
    };

    linkToInstance = <T extends PluginInstance, S extends PluginInstance = T>(pluginTypeConstructor: Type<T>, subPluginType?: Type<S>) => {
        if (!this.card()) return;
        Promise.all([import('../http/plugin.instance.factory'), import('@app/_modals/modal-base-service')])
            .then(async ([{ PluginInstanceFactory }, { ModalBaseService }]) => {
                const factory = NxGlobal.getService(PluginInstanceFactory as any) as any;
                const currentRoot = NxGlobal.getCurrentRoot();

                const rootInstances = factory.getRootPluginInstancesByConstructor(pluginTypeConstructor);
                if (rootInstances.length === 0) return;
                const sampleInstance = rootInstances[0] as any;

                let pluginInstance: any = subPluginType ? factory.instancesFor(currentRoot, subPluginType) : undefined;
                if (!pluginInstance && currentRoot) {
                    const interfaceProperty = sampleInstance.getInterfacePropertyName();
                    const projectInstances = factory.getInstances(currentRoot, [interfaceProperty]).filter((_: any) => _ instanceof pluginTypeConstructor);
                    if (projectInstances.length > 0) pluginInstance = projectInstances[0];
                }
                if (!pluginInstance) pluginInstance = sampleInstance;

                const ModalComponent = await PluginInstanceFactory.getModalComponentForPlugin(pluginInstance);
                if (!ModalComponent) return;

                const vcardAttr = pluginInstance.getVcardAttributeName();
                ModalBaseService.open(ModalComponent, pluginInstance)
                    .then((userId: string) => {
                        if (userId && this.card()) {
                            const updatedVcard = this.card()?.toString() + `\n${vcardAttr}:${userId}`;
                            this.update({ vcard: updatedVcard }).subscribe(() => {
                                this.card.set(new Vcard(updatedVcard));
                            });
                        }
                    })
                    .catch();
            })
            .catch();
    };

    linkToPlugin = (rootInstance: PluginInstance) => {
        if (!this.card()) return;
        Promise.all([import('../http/plugin.instance.factory'), import('@app/_modals/modal-base-service')])
            .then(async ([{ PluginInstanceFactory }, { ModalBaseService }]) => {
                const factory = NxGlobal.getService(PluginInstanceFactory as any) as any;
                const currentRoot = NxGlobal.getCurrentRoot();
                let pluginInstance: PluginInstance = rootInstance;
                if (currentRoot) {
                    const projectInstances = factory.getInstances(currentRoot, [rootInstance.getInterfacePropertyName()])
                        .filter((i: any) => i.getPluginTypeName() === rootInstance.getPluginTypeName());
                    if (projectInstances.length > 0) pluginInstance = projectInstances[0];
                }
                await new Promise<void>(resolve => pluginInstance.init.subscribe(() => resolve()));
                // If the chosen instance has no users, scan all cached instances for one that does
                if (!(pluginInstance as any).getUsers?.()?.length) {
                    const withUsers = (Object.values(factory.instances) as PluginInstance[])
                        .find((i: any) => i.getPluginTypeName() === rootInstance.getPluginTypeName() && i.getUsers?.()?.length > 0);
                    if (withUsers) pluginInstance = withUsers;
                }
                const ModalComponent = await PluginInstanceFactory.getModalComponentForPlugin(pluginInstance);
                if (!ModalComponent) return;
                const vcardAttr = pluginInstance.getVcardAttributeName();
                ModalBaseService.open(ModalComponent, pluginInstance)
                    .then((userId: string) => {
                        if (userId && this.card()) {
                            const updatedVcard = this.card()?.toString() + `\n${vcardAttr}:${userId}`;
                            this.update({ vcard: updatedVcard }).subscribe(() => {
                                this.card.set(new Vcard(updatedVcard));
                            });
                        }
                    })
                    .catch();
            })
            .catch();
    };

    openProfile = <T extends PluginInstance>(pluginType: Type<T>) => {
        import('../http/plugin.instance.factory')
            .then(({ PluginInstanceFactory }) => {
                const factory = NxGlobal.getService(PluginInstanceFactory as any) as any;
                const instances = factory.getRootPluginInstancesByConstructor(pluginType);
                if (instances.length === 0) return;
                const instance = instances[0];
                const userId = this.getUserIdForPlugin(instance.getVcardAttributeName());
                if (!userId) return;
                const profileUrl = instance.getProfileUrl(userId);
                if (profileUrl) window.open(profileUrl, '_blank');
            })
            .catch();
    };

    getInstanceIconClass = (instance: any): string => {
        if (!instance) return '';
        const userId = this.getUserIdForPlugin(instance.getVcardAttributeName());
        if (!userId) return '';
        if (instance.state !== 'connected') return 'text-muted';
        return instance.isUserInInstance(userId) ? 'text-success' : 'text-warning';
    };

    getInstanceTooltip = (instance: any): string => {
        if (!instance) return '';
        const userId = this.getUserIdForPlugin(instance.getVcardAttributeName());
        if (!userId) return '';
        if (instance.state !== 'connected') return `Loading ${instance.getPluginTypeName()} connection...`;
        if (!instance.isUserInInstance(userId)) return `User has ${instance.getPluginTypeName()} account but is not in this project`;
        return `${instance.getName()} Profile`;
    };
}
