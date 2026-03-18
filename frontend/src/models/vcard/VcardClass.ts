import { Color } from "src/constants/Color"
import { Serializable } from "../serializable"
import { Vcard } from "./Vcard"
import { NxGlobal } from "@app/nx/nx.global"
import type { PluginInstanceFactory } from "../http/plugin.instance.factory"
import type { Type } from "@angular/core"
import type { PluginInstance } from "../http/plugin.instance"
import { VcardRow } from "./VcardRow"

let _pluginFactoryClass: any = null
import("../http/plugin.instance.factory").then(({ PluginInstanceFactory }) => _pluginFactoryClass = PluginInstanceFactory).catch()

export abstract class VcardClass extends Serializable {

    __vcardExchangeString: string
    gender: string = ''

    card?: Vcard
    get vcard(): string { return this.card?.toString() ?? '' }
    set vcard(val: string) { this.card = new Vcard(val) }

    #dummyName: string = ''
    set name(val) { this.#dummyName = val }
    get name(): string { return this.card?.name ?? this.#dummyName }

    #descAdr: string[] = ['post office box','apartment or suite number','street address', 'locality (e.g., city)', 'region (e.g., state or province)', 'postal code', 'country name']
    #descN: string[] = ['Family Names', 'Given Names', 'Additional Names', 'Honorific Prefixes', 'Honorific Suffixes']

    honoraryPrefix:string = ''
    honorarySuffix:string = ''
    firstName:string = ''
    familyName:string = ''
    fullName:string = ''
    salutation:string = ''
    url?:string[]
    role:string = ''
    countryCode?:string
    
    #getSalutation() {
        const lang = this.card?.first('X-LANG')?.vals[0] ?? 'de';
        const salutations: Record<string, Record<string, string>> = {
            en: { M: 'Mr.', F: 'Mrs.' },
            de: { M: 'Herr', F: 'Frau' }
        };
        const fallback = salutations[lang]?.[this.gender ?? ''] ?? '???';
        return this.card?.get('N')?.first()?.vals[2] ?? fallback
    }

    // https://datatracker.ietf.org/doc/html/rfc6350#section-6.3.1
    descAdr = (index: any): string => this.#descAdr[parseInt(index)]

    // https://datatracker.ietf.org/doc/html/rfc6350#section-6.2.2
    descN = (index: any): string => this.#descN[parseInt(index)]
    
    serialize (_json: any) {
        const personal = this.getPersonal()
        const N = personal?.card?.get('N')?.first()?.vals
        if (N) {
            this.honoraryPrefix = N[3]
            this.honorarySuffix = N[4]
            this.familyName     = N[0]
            this.firstName      = N[1]
        }
        this.gender = personal?.gender ?? ''
        this.honoraryPrefix = personal?.honoraryPrefix ?? ''
        this.honorarySuffix = personal?.honorarySuffix ?? ''
        this.fullName       = this.card?.get('FN')?.first()?.vals.join('') ?? ''
        this.salutation     = this.#getSalutation()
        this.colorCss       = Color.posToHex(parseInt(this.id))
        this.url            = this.card?.get('N')?.map(_ => _.vals[0])
        this.role           = this.card?.get('ROLE')?.first()?.vals.join('') ?? ''
        this.countryCode    = this.card?.get('ADR')?.map(_ => _.vals[6]).first()
    }

    getPersonal = (): VcardClass|undefined => this
    getFormality = (): string => this.getPersonal()?.card?.first('X-FORMALITY')?.vals[0] || 'formal'
    getLang = (): string => this.getPersonal()?.card?.first('X-LANG')?.vals[0] || 'de'
    setLang(value: string) {
        const personal = this.getPersonal()
        const existingRow = personal?.card?.rows.find(r => r.key === 'X-LANG');
        if (existingRow) {
            existingRow.vals[0] = value;
        } else {
            personal?.card?.rows.push(VcardRow.fromString(`X-LANG:${value}`)!);
        }
    }
    setFormality(value: string) {
        const personal = this.getPersonal()
        const existingRow = personal?.card?.rows.find(r => r.key === 'X-FORMALITY');
        if (existingRow) {
            existingRow.vals[0] = value;
        } else {
            personal?.card?.rows.push(VcardRow.fromString(`X-FORMALITY:${value}`)!);
        }
    }
    isEuropeanCountry = () => this.countryCode ? NxGlobal.global.euCountries?.contains(this.countryCode) : false

    // Generic plugin integration methods
    getUserIdForPlugin = (attrName: string): string | undefined => this.card?.first(attrName)?.val()

    hasLinkForPlugin = (attrName: string): boolean => !!this.getUserIdForPlugin(attrName)

    canLinkToPluginByName = (pluginKey: string): boolean => {
        if (!_pluginFactoryClass) return false

        try {
            const factory = NxGlobal.getService(_pluginFactoryClass) as PluginInstanceFactory
            if (!factory) return false

            // Check if plugin instances of this type exist
            const encs = factory.getPluginEncryptionsOfType(pluginKey)
            if (encs.length === 0) return false

            // Map plugin key to vcard attribute name
            const vcardAttrMap: Record<string, string> = {
                'mantis': 'X-NEXUS-MANTISBT',
                'git': 'X-NEXUS-GIT',
                'mattermost': 'X-NEXUS-MATTERMOST'
            }
            const vcardAttr = vcardAttrMap[pluginKey]
            if (!vcardAttr) return false

            // Check if user already has this attribute
            return !this.hasLinkForPlugin(vcardAttr)
        } catch (_error: any) {
            return false
        }
    }

    canLinkToInstance = <T extends PluginInstance>(pluginType: Type<T>): boolean => {
        if (!_pluginFactoryClass) return false

        try {
            const factory = NxGlobal.getService(_pluginFactoryClass) as PluginInstanceFactory
            if (!factory) return false

            // Get a sample instance to check vcard attribute
            const instances = factory.getRootPluginInstancesByConstructor(pluginType)
            if (instances.length === 0) return false

            const sampleInstance = instances[0] as any
            const vcardAttr = sampleInstance.getVcardAttributeName()
            if (this.hasLinkForPlugin(vcardAttr)) return false

            const currentProject = NxGlobal.global.currentRoot
            if (currentProject) {
                // Check if current project has plugin instances of this type
                const interfaceProperty = sampleInstance.getInterfacePropertyName()
                const projectInstances = factory.getInstances(currentProject, [interfaceProperty])
                    .filter(_ => _ instanceof pluginType)
                return projectInstances.length > 0
            }

            // Fallback: check if there are any plugin encryptions configured
            const pluginTypeName = sampleInstance.getPluginTypeName()
            const encs = factory.getPluginEncryptionsOfType(pluginTypeName)
            return encs.length > 0
        } catch (_error: any) {
            return false
        }
    }

    linkToInstance = <T extends PluginInstance, S extends PluginInstance = T>(pluginTypeConstructor: Type<T>, subPluginType?: Type<S>) => {
        if (!this.card) return

        // Lazy imports to avoid circular dependency
        Promise.all([
            import("../http/plugin.instance.factory"),
            import("@app/_modals/modal-base-service")
        ]).then(async ([{ PluginInstanceFactory }, { ModalBaseService }]) => {
            const factory = NxGlobal.getService(PluginInstanceFactory as any) as any
            const currentRoot = NxGlobal.getCurrentRoot()
            
            // Try to get project-specific instance first, fallback to root
            let pluginInstance: any = subPluginType ? factory.instancesFor(currentRoot, subPluginType.name) : undefined
            if (!pluginInstance) {
                // For GitLab/Git plugins, try to get repository instances from current project
                if (pluginTypeConstructor.name === 'GitLabPlugin' && currentRoot) {
                    const repoInstances = factory.getRepositoryInstances(currentRoot)
                    if (repoInstances.length > 0) {
                        pluginInstance = repoInstances[0]
                    }
                }
                // For Mantis plugins, try to get task instances from current project
                else if (pluginTypeConstructor.name === 'MantisPlugin' && currentRoot) {
                    const taskInstances = factory.getTaskInstances(currentRoot)
                    const mantisInstances = taskInstances.filter((_: any) => _ instanceof pluginTypeConstructor)
                    if (mantisInstances.length > 0) {
                        pluginInstance = mantisInstances[0]
                    }
                }
                // For Mattermost, try to get chat instances from current project
                else if (pluginTypeConstructor.name === 'MattermostPlugin' && currentRoot) {
                    const chatInstances = factory.getChatInstances(currentRoot)
                    if (chatInstances.length > 0) {
                        pluginInstance = chatInstances[0]
                    }
                }
                
                // Fallback to root instances if no project-specific instance found
                if (!pluginInstance) {
                    const instances = factory.getRootPluginInstancesByConstructor(pluginTypeConstructor)
                    if (instances.length === 0) return
                    pluginInstance = instances[0]
                }
            }

            // Get the appropriate modal component from the factory
            const ModalComponent = await PluginInstanceFactory.getModalComponentForPlugin(pluginInstance)
            if (!ModalComponent) return
            
            const vcardAttr = pluginInstance.getVcardAttributeName()
            ModalBaseService.open(ModalComponent, pluginInstance).then((userId: string) => {
                if (userId && this.card) {
                    const updatedVcard = this.card.toString() + `\n${vcardAttr}:${userId}`
                    this.update({ vcard: updatedVcard }).subscribe(() => {
                        if (this) {
                            this.vcard = updatedVcard
                        }
                    })
                }
            }).catch()
        }).catch()
    }

    openProfile = <T extends PluginInstance>(pluginType: Type<T>) => {
        // Lazy import to avoid circular dependency
        import("../http/plugin.instance.factory").then(({ PluginInstanceFactory }) => {
            const factory = NxGlobal.getService(PluginInstanceFactory as any) as any
            const instances = factory.getRootPluginInstancesByConstructor(pluginType)
            if (instances.length === 0) return

            const instance = instances[0]
            const userId = this.getUserIdForPlugin(instance.getVcardAttributeName())
            if (!userId) return

            const profileUrl = instance.getProfileUrl(userId)
            if (profileUrl) window.open(profileUrl, '_blank')
        }).catch()
    }

    // Generic helper methods for UI display
    getInstanceIconClass = (instance: any): string => {
        if (!instance) return ''
        const userId = this.#getUserIdForInstance(instance)
        if (!userId) return ''
        if (instance.state !== 'connected') return 'text-muted'
        return instance.isUserInInstance(userId) ? 'text-success' : 'text-warning'
    }

    getInstanceTooltip = (instance: any): string => {
        if (!instance) return `${instance?.getName() || 'Plugin'} Profile`
        const userId = this.#getUserIdForInstance(instance)
        if (!userId) return ''
        if (instance.state !== 'connected') {
            return `Loading ${instance.getName()} connection...`
        }
        if (!instance.isUserInInstance(userId)) {
            return `User has ${instance.getName()} account but is not in this project`
        }
        return `${instance.getName()} Profile`
    }

    #getUserIdForInstance = (instance: any): string | undefined => {
        if (!instance) return undefined
        const attrName = instance.getVcardAttributeName()
        return this.card?.first(attrName)?.val()
    }

}
