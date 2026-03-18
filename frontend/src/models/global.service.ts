import { Enum } from 'src/models/enum';
import { Inject, Injectable, inject } from '@angular/core';
import { APP_BASE_HREF } from '@angular/common';
import { environment } from 'src/environments/environment';
import { BaseHttpService } from "./http.service";
import { User } from "src/models/user/user.model";
import { Dictionary } from "src/constants/constants";
import { Param } from "src/models/param.model";
import { map, ReplaySubject, tap } from "rxjs";
import { Encryption } from "src/models/encryption/encryption.model";
import { AuthenticationService } from "./auth.service";
import { deleteCookie, getCookie } from "src/constants/cookies";
import { NexusHttpInterceptor } from "src/app/http.interceptor";
import { HttpHeaders } from "@angular/common/http";
import { resolved } from "src/app/nx/nx.service";
import { PluginInstanceFactory } from "./http/plugin.instance.factory";
import { Router } from "@angular/router";
import { NxGlobal } from "src/app/nx/nx.global";
import { Project } from "./project/project.model";
import { LeadSource } from "./project/lead_source.model";
import { ProjectState } from "./project/project-state.model";
import { NexusHttpService } from "./http/http.nexus";

/** DEV: override your own role_names for testing. Set to null to disable. */
const DEV_ROLES: string[] | null = null // e.g. ['user', 'invoicing']

interface NavigationItem {
    logo: string
    tooltip: string
    link: string
    visible: boolean
}

@Injectable({ providedIn: 'root' })
export class GlobalService extends BaseHttpService {

    tables          : any[]
    relations       : any[]
    accessors       : Record<string, Record<string, string>> = {}
    user            : User | undefined
    team            : User[]
    teamAll         : User[]
    enum            : Dictionary
    authentication  : string
    encryptions     : Encryption[] = []
    dashboards      : Dictionary[]
    #plugins        : Dictionary = {}
    settings        : any
    encryptionsValid: boolean = false
    loaded          : boolean = false
    lead_sources    : LeadSource[]
    project_states : ProjectState[] = []
    roles           : any[] = []
    navigationItems: NavigationItem[] = []
    bottomNavigationItems: NavigationItem[] = []

    selectedRootObject: any
    selectedSubObject: any
    onObjectSelected: ReplaySubject<any> = new ReplaySubject<any>(1)
    onRootObjectSelected: ReplaySubject<any> = new ReplaySubject<any>(1)
    euCountries:string[]

    env = environment
    init = new ReplaySubject<void>(1)
    nxHttp = inject(NexusHttpService)

    supportedLanguages: any[] = ["en", "de"]
    _locale: string = 'de'
    get locale(): string { return this._locale }
    set locale(newLocale) {
        this._locale = newLocale
        this.switchLocale(newLocale)
    }

    
    @Inject(APP_BASE_HREF) private baseHref: string
    

    get ProjectState(): Enum { return this.Enum('ProjectState') }
    get InvoiceitemType(): Enum { return this.Enum('InvoiceitemType') }
    get InvoiceVatHandling(): Enum { return this.Enum('InvoiceVatHandling') }
    get CommentType(): Enum { return this.Enum('CommentType') }

    #auth = inject(AuthenticationService)
    #factory = inject(PluginInstanceFactory)
    #router = inject(Router)

    constructor() {
        super()
        setTimeout(async() => {
            if (AuthenticationService.sysinfo?.method === 'token') {
                const token = getCookie('api_token')
                if (!token) return
                this.setTokenInterceptor(token)
                await this.reload()
            }
            // For Keycloak, reload() will be called after authentication is confirmed
            // in the auth guard to ensure the JWT token is available
        })
    }

    startKeycloakInit = async () => {
        await this.reload()
    }


    reload = () => this.http.get(environment.envApi + 'users/environment').subscribe({
        next: _ => this.setUserEnvironment(_),
        error: _ => {
            if (AuthenticationService.sysinfo?.method === 'token') {
                deleteCookie('api_token')
                delete NexusHttpInterceptor.headers[environment.envApi]
                this.#router.navigate(['/login'])
            } else {
                this.#router.navigate(['/environment404'])
            }
        }
    })
    reloadInvoiceNumber = () => this.get('invoices/current_no_int').pipe(tap(_ => this.settings['INVOICE_NO_CURRENT'] = '' + _))

    setTokenInterceptor = (token:string) => {
        NexusHttpInterceptor.add(environment.envApi, new HttpHeaders({ 
            'Content-Type': 'application/json', 
            'Access-Control-Allow-Origin':'*', 
            'Access-Control-Allow-Credentials': "true",
            'Authorization': 'Bearer ' + token
        }))
    }
    setUserEnvironment = async (env:any) => {
        if (await this.#auth.isLoggedIn() && (!env || !('user' in env))) {
            this.#router.navigate(['/environment404'])
            return
        }
        
        this.user             = User.fromJson(env.user)
        if (!environment.production && DEV_ROLES) this.user.role_names = DEV_ROLES
        const t: User[] = Object.values(env.team).map((data: any) => {
            const newUser = User.fromJson(data)
            if (data.encryptions) {
                newUser.encryptions = data.encryptions.map((_:any) => Encryption.fromJson(_))
            }
            return newUser
        })
        this.team           = t.filter(_ => !_.is_retired)
        this.teamAll        = t
        this.settings       = env.settings
        this.enum           = env.enums
        this.tables         = env.tables
        this.relations        = env.relations
        this.accessors        = env.accessors || {}
        this.dashboards     = env.dashboards
        this.#plugins       = env.plugins
        this.project_states = env.project_states.map((_:any) => ProjectState.fromJson(_))
        this.lead_sources   = env.lead_sources.map((_:any) => LeadSource.fromJson(_))
        this.roles          = env.roles || []
        this.euCountries    = env.eu_countries

        NxGlobal.ME_ID = env.settings.ME_ID



        // decrypt user tokens
        await this.user.encryptionInitialized.subscribe(() => {
            const nexus = Encryption.fromJson({ key: 'nexus' })
            nexus.value = { url: environment.envApi }
            this.encryptions = [
                nexus,
                ...env.encryptions.map((_:Encryption) => Encryption.fromJson(_)).filter((obj:Encryption) => {
                    if (!('value' in obj)) return false
                    if (!obj.value) return false
                    if (typeof obj.value !== 'object') return false     // cold not decrypt because of missing or wrong keypair
                    if (!('url' in obj.value)) return false
                    this.encryptionsValid = true
                    return true
                })
            ]
            this.#factory.getPluginInstances()
            this.#initializeNavigationItems()
            this.loaded = true
            this.init.next()
        })
        this.user.initRsaEncryption()
    }

    getEnc = (key:string):any[] => this.encryptions.filter(_ => _.key == key).map(_ => _.value)
    userFor                   = (id: string): User | undefined => this.teamAll?.filter(_ => _.id == id)[0] ?? undefined
    hasPlugin = (key:string):boolean => (key in this.#plugins)
    Enum = (key: string): Enum => new Enum(this.enum[key])

    //Settings = (id: string, def: any = {}): any => (id in this.settings) ? this.settings[id]: new Param(Object.assign(def, { key: id, value: undefined }))
    setting = (_: string) => (this.settings && _ in this.settings) ? this.settings[_] : undefined
    settingParam = async (_:string) => new Promise<Param>(resolve => {
        this.init.subscribe(() => {
            resolve(Param.fromJson({ key: _, value: this.setting(_) }))
        })
    })
    currencySymbol = () => this.setting('SYS_CURRENCY')


    switchLocale(newLang: string) {
        if (environment.production && this.isLangSupported(newLang)) {
            let currentBase = this.baseHref
            currentBase = currentBase.replace("/", "")
            const position = currentBase.lastIndexOf('/');
            currentBase = currentBase.substring(0, position) + currentBase.substring(position + 1)
            const splitted = currentBase.split("/")
            const currentLang = splitted[splitted.length - 1]
            if (currentLang != newLang) {
                const newBase = this.baseHref.replace(currentLang, newLang)
                window.location.href = window.location.href.replace(this.baseHref, newBase)
            }
        }
    }

    isLangSupported(lang: string): boolean {
        return this.findBestMatchingLang(lang) != undefined
    }

    findBestMatchingLang(lang: string): string {
        let bestMatch = this.supportedLanguages.find((supportedLang) => { return supportedLang == lang })
        if (!bestMatch) {
            bestMatch = this.supportedLanguages.find((supportedLang) => { return supportedLang.startsWith(lang.split("-")[0]) })
        }
        return bestMatch
    }

    // global selection propagation
    onSelectionIn<T>(table:()=>T[], ...sumKeys:string[]) {
        return this.onObjectSelected.pipe(map(data => {
            let selected:T[] = []
            if (data && Array.isArray(data)) selected = data
            else if (data) selected = [data]

            const sum = Array(sumKeys.length).fill(0)
            if (selected.length && table().includes(selected[0])) {
                for (const _ of selected) {
                    for (let i = 0; i < sumKeys.length; i++) {
                        sum[i] += resolved((_ as any)[sumKeys[i]])
                    }
                }
                return [selected, ...sum]
            } else {
                return [[], ...sum]
            }
        }))
    }
    forceSelectionUpdate() {
        this.onObjectSelected.next(this.selectedSubObject)
    }
    registerSelectedObject = (_: any, isRoot: boolean = true) => {        
        if (_ && _.constructor === Array) {
            if (_.length == 0) _ = null
            else if (_.length == 1) _ = _[0]
        }
        if (isRoot) {
            this.onRootObjectSelected.next(_)
            this.selectedRootObject = _
        } else {
            this.selectedSubObject = _
        }
        if (_ === null && !isRoot) {
            this.onObjectSelected.next(this.selectedRootObject)
        } else {
            this.onObjectSelected.next(_)
        }
    }
    currentRoot = () => this.selectedRootObject
    currentProjectRoot = () => this.selectedRootObject instanceof Project ? this.selectedRootObject as Project : null

    #initializeNavigationItems() {
        const i18nDashboard = $localize`:@@i18n.common.dashboard:dashboard`
        const i18nContacts  = $localize`:@@i18n.common.contacts:contacts`
        const i18nMarketing = $localize`:@@i18n.common.marketing:marketing`
        const i18nProjects  = $localize`:@@i18n.common.projects:projects`
        const i18nInvoices  = $localize`:@@i18n.common.invoices:invoices`
        const i18nProducts  = $localize`:@@i18n.common.products:products`
        const i18nTeam      = $localize`:@@i18n.common.team:team`
        const i18nCalendar  = $localize`:@@i18n.common.calendar:calendar`
        const i18nSettings  = $localize`:@@i18n.common.settings:settings`

        this.navigationItems = [
            { logo: 'logo', tooltip: i18nDashboard, link: '/dashboard', visible: true },
            { logo: 'contact', tooltip: i18nContacts, link: '/customers', visible: this.#hasRole('user') },
            { logo: 'marketing', tooltip: i18nMarketing, link: '/marketing', visible: this.#hasRole('marketing') },
            { logo: 'project_outline', tooltip: i18nProjects, link: '/projects', visible: this.#hasRole('user') },
            { logo: 'invoice', tooltip: i18nInvoices, link: '/invoices', visible: this.#hasRole('invoicing') },
            { logo: 'product', tooltip: i18nProducts, link: '/products', visible: this.#hasRole('product_manager') },
            { logo: 'team', tooltip: i18nTeam, link: '/hr', visible: this.#hasAnyRole(['hr', 'project_manager']) },
            { logo: 'calendar', tooltip: i18nCalendar, link: '/calendar', visible: this.#hasRole('user') }
        ]

        this.bottomNavigationItems = [
            { logo: 'settings', tooltip: i18nSettings, link: '/settings', visible: this.#hasRole('admin') }
        ]
    }

    #hasRole(role: string): boolean {
        return this.user?.hasRole(role) || false
    }

    #hasAnyRole(roles: string[]): boolean {
        return this.user?.hasAnyRole(roles) || false
    }

    getAllowedSucceedingProjectStatesFor = (project:Project) => this.project_states.filter(_ => ProjectState.StateChangeWorkflow[project.state.id].contains(parseInt(_.id)))

}

