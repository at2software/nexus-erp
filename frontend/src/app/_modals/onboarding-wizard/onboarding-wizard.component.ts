import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, OnInit, signal } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { forkJoin, map, switchMap } from 'rxjs';
import { GlobalService } from '@models/global.service';
import { CompanyService } from '@models/company/company.service';
import { ParamService } from '@models/param.service';
import { UserService } from '@models/user/user.service';
import { RoleService } from '@models/user/role.service';
import { typeahead } from '@constants/constants';
import { NxGlobal } from '@app/nx/nx.global';
import { SpinnerComponent } from '@shards/spinner/spinner.component';

const DISMISSED_KEY = 'nexus_onboarding_dismissed';

interface AddedUser {
    name: string;
    email: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'app-onboarding-wizard',
    templateUrl: './onboarding-wizard.component.html',
    styleUrls: ['./onboarding-wizard.component.scss'],
    standalone: true,
    imports: [FormsModule, SpinnerComponent],
})
export class OnboardingWizardComponent implements OnInit {
    global = inject(GlobalService);
    #companyService = inject(CompanyService);
    #paramService = inject(ParamService);
    #userService = inject(UserService);
    #roleService = inject(RoleService);
    #cdr = inject(ChangeDetectorRef);

    #adminRoleId: number | null = null;

    // visibility
    visible = signal(false);
    completed = signal(false);

    // step: 0=company, 1=localization, 2=team, 3=success
    step = signal(0);
    loading = signal(false);

    needsCompany = signal(false);
    needsLocalization = signal(false);

    // company step
    companyName = '';

    // localization step
    language = '';
    country = '';
    currency = '';

    // team step
    newUserName = '';
    newUserEmail = '';
    newUserPassword = '';
    addedUsers: AddedUser[] = [];
    addUserLoading = signal(false);
    addUserError = '';

    languages: { key: string; name: string }[] = [];
    countries: { key: string; name: string }[] = [];
    currencies: { key: string; name: string }[] = [];

    ngOnInit() {
        Promise.all([import('src/constants/iso0639-1'), import('src/constants/iso3166'), import('src/constants/iso4217')]).then(([lang, country, currency]) => {
            this.languages = typeahead(lang.LANGUAGE_CODES, 'alpha2', 'English');
            this.countries = typeahead(country.COUNTRY_CODES, 'alpha-2', 'name');
            this.currencies = typeahead(currency.CURRENCY_CODES, 'AlphabeticCode', 'Currency');
        });
        this.global.init.subscribe(() => this.#initialize());
    }

    async #initialize() {
        if (!this.global.user?.hasRole('admin')) return;
        const { roles } = await this.#roleService.loadRoleManagement();
        this.#adminRoleId = roles.find((r) => r.name === 'admin')?.id ?? null;

        this.needsCompany.set(!this.global.setting('ME_ID'));
        this.needsLocalization.set(!this.global.setting('SYS_LANGUAGE') || !this.global.setting('SYS_COUNTRY') || !this.global.setting('SYS_CURRENCY'));

        const hasOtherAdmin = this.global.teamAll?.some((u: any) => u.hasRole?.('admin') && u.name !== 'Super Admin') ?? false;

        if (!this.needsCompany() && !this.needsLocalization() && hasOtherAdmin) return;
        if (!this.needsCompany() && !this.needsLocalization() && localStorage.getItem(DISMISSED_KEY)) return;

        if (!this.needsCompany()) {
            this.language = this.global.setting('SYS_LANGUAGE') || '';
            this.country = this.global.setting('SYS_COUNTRY') || '';
            this.currency = this.global.setting('SYS_CURRENCY') || '';
            this.step.set(this.needsLocalization() ? 1 : 2);
        }

        this.visible.set(true);
        this.#cdr.detectChanges();
    }

    get showModal(): boolean {
        return (this.visible() || this.step() === 3) && !this.completed();
    }

    get totalSteps(): number {
        return (this.needsCompany() ? 1 : 0) + (this.needsLocalization() ? 1 : 0) + 1;
    }

    get currentStepIndex(): number {
        if (this.step() === 0) return 0;
        if (this.step() === 1) return this.needsCompany() ? 1 : 0;
        if (this.step() === 2) return (this.needsCompany() ? 1 : 0) + (this.needsLocalization() ? 1 : 0);
        return this.totalSteps;
    }

    get progressPercent(): number {
        if (this.step() === 3) return 100;
        if (this.totalSteps === 0) return 0;
        return Math.min(95, (this.currentStepIndex / this.totalSteps) * 100);
    }

    dismiss() {
        localStorage.setItem(DISMISSED_KEY, '1');
        this.visible.set(false);
    }

    createCompany() {
        if (!this.companyName.trim() || this.loading()) return;
        this.loading.set(true);
        this.#companyService
            .create(this.companyName.trim())
            .pipe(switchMap((company: any) => this.#paramService.update('params/ME_ID', { value: company.id }).pipe(map(() => company))))
            .subscribe({
                next: (company: any) => {
                    this.global.settings['ME_ID'] = company.id;
                    NxGlobal.ME_ID = company.id;
                    this.loading.set(false);
                    this.language = this.global.setting('SYS_LANGUAGE') || '';
                    this.country = this.global.setting('SYS_COUNTRY') || '';
                    this.currency = this.global.setting('SYS_CURRENCY') || '';
                    this.step.set(this.needsLocalization() ? 1 : 2);
                },
                error: () => {
                    this.loading.set(false);
                },
            });
    }

    saveLocalization() {
        if (!this.language || !this.country || !this.currency || this.loading()) return;
        this.loading.set(true);
        forkJoin([this.#paramService.update('params/SYS_LANGUAGE', { value: this.language }), this.#paramService.update('params/SYS_COUNTRY', { value: this.country }), this.#paramService.update('params/SYS_CURRENCY', { value: this.currency })]).subscribe({
            next: () => {
                this.global.settings['SYS_LANGUAGE'] = this.language;
                this.global.settings['SYS_COUNTRY'] = this.country;
                this.global.settings['SYS_CURRENCY'] = this.currency;
                this.loading.set(false);
                this.step.set(2);
            },
            error: () => {
                this.loading.set(false);
            },
        });
    }

    get canAddUser(): boolean {
        return !!this.newUserName.trim() && !!this.newUserEmail.trim() && this.newUserPassword.length >= 8 && !this.addUserLoading();
    }

    addUser() {
        if (!this.canAddUser) return;
        this.addUserLoading.set(true);
        this.addUserError = '';
        const name = this.newUserName.trim();
        const email = this.newUserEmail.trim();
        this.#userService
            .create({
                name,
                email,
                password: this.newUserPassword,
            })
            .subscribe({
                next: async (user: any) => {
                    if (this.#adminRoleId && user?.id) {
                        await this.#roleService.assignRole(this.#adminRoleId, user.id);
                    }
                    this.addedUsers.push({ name, email });
                    this.newUserName = '';
                    this.newUserEmail = '';
                    this.newUserPassword = '';
                    this.addUserLoading.set(false);
                },
                error: () => {
                    this.addUserError = $localize`:@@i18n.onboarding.wizard.addUserError:Could not create user. The e-mail may already be in use.`;
                    this.addUserLoading.set(false);
                },
            });
    }

    continueFromTeam() {
        this.step.set(3);
    }

    close() {
        this.completed.set(true);
    }
}
