import { Enum } from '@models/enum';
import { Injectable, inject, signal } from '@angular/core';
import { APP_BASE_HREF } from '@angular/common';
import { environment } from 'src/environments/environment';
import { User } from '@models/user/user.model';
import { Param } from '@models/param.model';
import { ReplaySubject, Subject, firstValueFrom, map, tap } from 'rxjs';
import { Encryption } from '@models/encryption/encryption.model';
import { AuthenticationService } from './auth.service';
import { deleteCookie, getCookie } from '@constants/cookies';
import { NexusHttpInterceptor } from '@app/http.interceptor';
import { HttpHeaders } from '@angular/common/http';
import { resolved } from '@app/nx/nx.service';
import { PluginInstanceFactory } from './http/plugin.instance.factory';
import { Router } from '@angular/router';
import { NxGlobal } from '@app/nx/nx.global';
import { Project } from './project/project.model';
import { LeadSource } from './project/lead_source.model';
import { ProjectState } from './project/project-state.model';
import { NexusHttpService } from './http/http.nexus';
import { Serializable } from './serializable';
import type { NxAction } from '@app/nx/nx.actions';
import type { INxContextMenu } from '@app/nx/nx.contextmenu.interface';
import { Dictionary } from '@constants/constants';
import { Dashboard, TableRelation, TableSchema, UserEnvironment } from '@models/api-response';

/** DEV: override your own role_names for testing. Set to null to disable. */
const DEV_ROLES: string[] | null = null; // e.g. ['user', 'invoicing']

interface NavigationItem {
    logo: string;
    tooltip: string;
    link: string;
    visible: boolean;
}

@Injectable({ providedIn: 'root' })
export class GlobalService extends NexusHttpService<Serializable> {
    // inject fields
    readonly #auth = inject(AuthenticationService);
    readonly #factory = inject(PluginInstanceFactory);
    readonly #router = inject(Router);
    readonly #baseHref = inject(APP_BASE_HREF);

    // public fields
    apiPath = '';
    tables!: TableSchema[];
    relations!: TableRelation[];
    accessors: Dictionary<Dictionary<string>> = {};
    user: User | undefined;
    team!: User[];
    teamAll!: User[];
    enum!: Dictionary;
    encryptions: Encryption[] = [];
    dashboards!: Dashboard[];
     
    settings!: Record<string, any>;
    readonly lead_sources = signal<LeadSource[]>([]);
    project_states: ProjectState[] = [];
    roles: unknown[] = [];
    euCountries!: string[];
    selectedRootObject: unknown;
    selectedSubObject: unknown;

    readonly loaded = signal(false);
    readonly encryptionsValid = signal(false);
    readonly navigationItems = signal<NavigationItem[]>([]);
    readonly bottomNavigationItems = signal<NavigationItem[]>([]);
    readonly onActionsResolved = new Subject<{ object: INxContextMenu; action: NxAction }>();
    readonly env = environment;
    readonly supportedLanguages: string[] = ['en', 'de'];

    // private fields
    #plugins: Dictionary = {};
    #locale: string = 'de';

    readonly #onObjectSelected = new ReplaySubject<unknown>(1);
    readonly onObjectSelected = this.#onObjectSelected.asObservable();
    readonly #onRootObjectSelected = new ReplaySubject<unknown>(1);
    readonly onRootObjectSelected = this.#onRootObjectSelected.asObservable();
    readonly #init = new ReplaySubject<void>(1);
    readonly init = this.#init.asObservable();

    get locale(): string { return this.#locale; }
    set locale(newLocale: string) {
        this.#locale = newLocale;
        this.switchLocale(newLocale);
    }

    get ProjectState(): Enum { return this.Enum('ProjectState'); }
    get InvoiceitemType(): Enum { return this.Enum('InvoiceitemType'); }
    get InvoiceVatHandling(): Enum { return this.Enum('InvoiceVatHandling'); }
    get CommentType(): Enum { return this.Enum('CommentType'); }

    constructor() {
        super();
        setTimeout(() => {
            if (AuthenticationService.sysinfo?.method === 'token') {
                const token = getCookie('api_token');
                if (!token) return;
                this.setTokenInterceptor(token);
                this.reload();
            }
            // For Keycloak, reload() will be called after authentication is confirmed
            // in the auth guard to ensure the JWT token is available
        });
    }

    startKeycloakInit = () => this.reload();

    reload = () =>
        this.http().get(environment.envApi + 'users/environment').subscribe({
            next: (_) => this.setUserEnvironment(_ as UserEnvironment),
            error: (_) => {
                if (AuthenticationService.sysinfo?.method === 'token') {
                    deleteCookie('api_token');
                    delete NexusHttpInterceptor.headers[environment.envApi];
                    this.#router.navigate(['/login']);
                } else {
                    this.#router.navigate(['/environment404']);
                }
            },
        });

    reloadInvoiceNumber = () => this.get('invoices/current_no_int').pipe(tap((_) => (this.settings['INVOICE_NO_CURRENT'] = '' + _)));

    setTokenInterceptor = (token: string) => {
        NexusHttpInterceptor.add(
            environment.envApi,
            new HttpHeaders({
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Credentials': 'true',
                Authorization: 'Bearer ' + token,
            }),
        );
    };

    setUserEnvironment = async (env: UserEnvironment | undefined) => {
        if ((await this.#auth.isLoggedIn()) && (!env || !('user' in env))) {
            this.#router.navigate(['/environment404']);
            return;
        }
        if (!env) return;

        this.user = User.fromJson(env.user);
        if (!environment.production && DEV_ROLES) this.user.role_names = DEV_ROLES;
        const t: User[] = Object.values(env.team).map((data) => {
            const newUser = User.fromJson(data);
            if (data.encryptions) {
                newUser.encryptions = data.encryptions.map((_) => Encryption.fromJson(_));
            }
            return newUser;
        });
        this.team = t.filter((_) => !_.is_retired);
        this.teamAll = t;
        this.settings = env.settings;
        this.enum = env.enums;
        this.tables = env.tables;
        this.relations = env.relations;
        this.accessors = env.accessors || {};
        this.dashboards = env.dashboards;
        this.#plugins = env.plugins;
        this.project_states = env.project_states.map((_) => ProjectState.fromJson(_));
        this.lead_sources.set(env.lead_sources.map((_) => LeadSource.fromJson(_)));
        this.roles = env.roles || [];
        this.euCountries = env.eu_countries;

        NxGlobal.ME_ID = env.settings.ME_ID as string;

        this.user.encryptionInitialized.subscribe(() => {
            const nexus = Encryption.fromJson({ key: 'nexus' });
            nexus.value = { url: environment.envApi };
            this.encryptions = [
                nexus,
                ...env.encryptions
                    .map((_) => Encryption.fromJson(_))
                    .filter((obj: Encryption) => {
                        if (!('value' in obj)) return false;
                        if (!obj.value) return false;
                        if (typeof obj.value !== 'object') return false;
                        if (!('url' in obj.value)) return false;
                        this.encryptionsValid.set(true);
                        return true;
                    }),
            ];
            this.#factory.getPluginInstances();
            this.#initializeNavigationItems();
            this.loaded.set(true);
            this.#init.next();
        });
        this.user.initRsaEncryption();
    };

    getEnc = (key: string): unknown[] => this.encryptions.filter((_) => _.key == key).map((_) => _.value);
    userFor = (id: string): User | undefined => this.teamAll?.filter((_) => _.id == id)[0] ?? undefined;
    hasPlugin = (key: string): boolean => key in this.#plugins;
    Enum = (key: string): Enum => new Enum(this.enum[key] as never);
    setting = (_: string) => (this.settings && _ in this.settings ? this.settings[_] : undefined);
    currencySymbol = () => this.setting('SYS_CURRENCY');

    settingParam = async (key: string) => {
        await firstValueFrom(this.init);
        return Param.fromJson({ key, value: this.setting(key) });
    };

    switchLocale(newLang: string) {
        if (environment.production && this.isLangSupported(newLang)) {
            let currentBase = this.#baseHref.replace('/', '');
            const position = currentBase.lastIndexOf('/');
            currentBase = currentBase.substring(0, position) + currentBase.substring(position + 1);
            const splitted = currentBase.split('/');
            const currentLang = splitted[splitted.length - 1];
            if (currentLang != newLang) {
                const newBase = this.#baseHref.replace(currentLang, newLang);
                window.location.href = window.location.href.replace(this.#baseHref, newBase);
            }
        }
    }

    isLangSupported = (lang: string) => !!this.findBestMatchingLang(lang);

    findBestMatchingLang = (lang: string): string | undefined =>
        this.supportedLanguages.find((s) => s === lang) ??
        this.supportedLanguages.find((s) => s.startsWith(lang.split('-')[0]));

    onSelectionIn<T>(table: () => T[], ...sumKeys: string[]) {
        return this.onObjectSelected.pipe(
            map((data) => {
                let selected: T[] = [];
                if (data && Array.isArray(data)) selected = data;
                else if (data) selected = [data as T];

                const sum = Array(sumKeys.length).fill(0);
                if (selected.length && table().includes(selected[0])) {
                    for (const _ of selected) {
                        for (let i = 0; i < sumKeys.length; i++) {
                            sum[i] += resolved((_ as Dictionary<unknown>)[sumKeys[i]]);
                        }
                    }
                    return [selected, ...sum];
                } else {
                    return [[], ...sum];
                }
            }),
        );
    }

    forceSelectionUpdate = () => this.#onObjectSelected.next(this.selectedSubObject);

    registerSelectedObject = (_: unknown, isRoot: boolean = true) => {
        if (_ && _.constructor === Array) {
            const selected = _ as unknown[];
            if (selected.length == 0) _ = null;
            else if (selected.length == 1) _ = selected[0];
        }
        if (isRoot) {
            this.#onRootObjectSelected.next(_);
            this.selectedRootObject = _;
        } else {
            this.selectedSubObject = _;
        }
        this.#onObjectSelected.next(_ === null && !isRoot ? this.selectedRootObject : _);
    };

    currentRoot = () => this.selectedRootObject;
    currentProjectRoot = () => (this.selectedRootObject instanceof Project ? (this.selectedRootObject as Project) : null);
    getAllowedSucceedingProjectStatesFor = (project: Project) => this.project_states.filter((_) => ProjectState.StateChangeWorkflow['' + project.state.id].contains('' + _.id));

    #initializeNavigationItems() {
        const i18nDashboard = $localize`:@@i18n.common.dashboard:dashboard`;
        const i18nContacts = $localize`:@@i18n.common.contacts:contacts`;
        const i18nMarketing = $localize`:@@i18n.common.marketing:marketing`;
        const i18nProjects = $localize`:@@i18n.common.projects:projects`;
        const i18nInvoices = $localize`:@@i18n.common.finances:finances`;
        const i18nProducts = $localize`:@@i18n.common.products:products`;
        const i18nTeam = $localize`:@@i18n.common.team:team`;
        const i18nCalendar = $localize`:@@i18n.common.calendar:calendar`;
        const i18nSettings = $localize`:@@i18n.common.settings:settings`;

        this.navigationItems.set([
            { logo: 'logo', tooltip: i18nDashboard, link: '/dashboard', visible: true },
            { logo: 'contact', tooltip: i18nContacts, link: '/customers', visible: this.#hasRole('user') },
            { logo: 'marketing', tooltip: i18nMarketing, link: '/marketing', visible: this.#hasRole('marketing') },
            { logo: 'project_outline', tooltip: i18nProjects, link: '/projects', visible: this.#hasRole('user') },
            { logo: 'invoice', tooltip: i18nInvoices, link: '/financial', visible: this.#hasRole('invoicing|financial') },
            { logo: 'product', tooltip: i18nProducts, link: '/products', visible: this.#hasRole('product_manager') },
            { logo: 'team', tooltip: i18nTeam, link: '/hr', visible: this.#hasAnyRole(['hr', 'project_manager']) },
            { logo: 'calendar', tooltip: i18nCalendar, link: '/calendar', visible: this.#hasRole('user') },
        ]);

        this.bottomNavigationItems.set([{ logo: 'settings', tooltip: i18nSettings, link: '/settings', visible: this.#hasRole('admin') }]);
    }

    #hasRole = (role: string) => this.user?.hasRole(role) || false;
    #hasAnyRole = (roles: string[]) => this.user?.hasAnyRole(roles) || false;
}
