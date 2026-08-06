import { ChangeDetectionStrategy, ChangeDetectorRef, Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { FormsModule } from '@angular/forms';
import { forkJoin, map, switchMap } from 'rxjs';
import { GlobalService } from '@models/global.service';
import { CompanyService } from '@models/company/company.service';
import { Param } from '@models/param/param.model';
import { UserService } from '@models/user/user.service';
import { RoleService } from '@models/user/role.service';
import { typeahead } from '@constants/constants';
import { SpinnerComponent } from '@shards/spinner/spinner.component';
import { User } from '@models/user/user.model';
import { Company } from '@models/company/company.model';
import { storageGet, storageSet } from '@constants/storage';

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
    imports: [FormsModule, SpinnerComponent],
})
export class OnboardingWizardComponent {
    global = inject(GlobalService);
    #companyService = inject(CompanyService);
    #userService = inject(UserService);
    #roleService = inject(RoleService);
    #cdr = inject(ChangeDetectorRef);

    #adminRoleId: number | null = null;

    visible = signal(false);
    completed = signal(false);

    step = signal(0);
    loading = signal(false);

    needsCompany = signal(false);
    needsLocalization = signal(false);

    companyName = '';

    language = '';
    country = '';
    currency = '';

    newUserName = signal('');
    newUserEmail = signal('');
    newUserPassword = signal('');
    addUserLoading = signal(false);
    addedUsers = signal<AddedUser[]>([]);
    addUserError = signal('');

    languages: { key: string; name: string }[] = [];
    countries: { key: string; name: string }[] = [];
    currencies: { key: string; name: string }[] = [];

    constructor() {
        Promise.all([import('@constants/iso/iso0639-1'), import('@constants/iso/iso3166'), import('@constants/iso/iso4217')]).then(([lang, country, currency]) => {
            this.languages = typeahead(lang.LANGUAGE_CODES, 'alpha2', 'English');
            this.countries = typeahead(country.COUNTRY_CODES, 'alpha-2', 'name');
            this.currencies = typeahead(currency.CURRENCY_CODES, 'AlphabeticCode', 'Currency');
        });
        this.global.init.pipe(takeUntilDestroyed()).subscribe(() => this.#initialize());
    }

    async #initialize() {
        if (!this.global.user?.hasRole('admin')) return;
        const { roles } = await this.#roleService.loadRoleManagement();
        this.#adminRoleId = roles.find((r) => r.name === 'admin')?.id ?? null;

        this.needsCompany.set(!this.global.setting('ME_ID'));
        this.needsLocalization.set(!this.global.setting('SYS_LANGUAGE') || !this.global.setting('SYS_COUNTRY') || !this.global.setting('SYS_CURRENCY'));

        const hasOtherAdmin = this.global.teamAll?.some((u: User) => u.hasRole?.('admin') && u.getName() !== 'Super Admin') ?? false;

        if (!this.needsCompany() && !this.needsLocalization() && hasOtherAdmin) return;
        if (!this.needsCompany() && !this.needsLocalization() && storageGet(DISMISSED_KEY, false)) return;

        if (!this.needsCompany()) {
            this.language = this.global.setting('SYS_LANGUAGE') || '';
            this.country = this.global.setting('SYS_COUNTRY') || '';
            this.currency = this.global.setting('SYS_CURRENCY') || '';
            this.step.set(this.needsLocalization() ? 1 : 2);
        }

        this.visible.set(true);
        this.#cdr.detectChanges();
    }

    readonly showModal = computed<boolean>(() => (this.visible() || this.step() === 3) && !this.completed());

    readonly totalSteps = computed<number>(() => (this.needsCompany() ? 1 : 0) + (this.needsLocalization() ? 1 : 0) + 1);

    readonly currentStepIndex = computed<number>(() => {
        if (this.step() === 0) return 0;
        if (this.step() === 1) return this.needsCompany() ? 1 : 0;
        if (this.step() === 2) return (this.needsCompany() ? 1 : 0) + (this.needsLocalization() ? 1 : 0);
        return this.totalSteps();
    });

    readonly progressPercent = computed<number>(() => {
        if (this.step() === 3) return 100;
        if (this.totalSteps() === 0) return 0;
        return Math.min(95, (this.currentStepIndex() / this.totalSteps()) * 100);
    });

    dismiss() {
        storageSet(DISMISSED_KEY, true);
        this.visible.set(false);
    }

    createCompany() {
        if (!this.companyName.trim() || this.loading()) return;
        this.loading.set(true);
        this.#companyService
            .create(this.companyName.trim())
            .pipe(switchMap((company: Company) => Param.write('params/ME_ID', company.id).pipe(map(() => company))))
            .subscribe({
                next: (company: Company) => {
                    this.global.settings['ME_ID'] = company.id;
                    this.global.me_id = company.id;
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
        forkJoin([Param.write('params/SYS_LANGUAGE', this.language), Param.write('params/SYS_COUNTRY', this.country), Param.write('params/SYS_CURRENCY', this.currency)]).subscribe({
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

    readonly canAddUser = computed<boolean>(() => !!this.newUserName().trim() && !!this.newUserEmail().trim() && this.newUserPassword().length >= 8 && !this.addUserLoading());

    addUser() {
        if (!this.canAddUser()) return;
        this.addUserLoading.set(true);
        this.addUserError.set('');
        const name = this.newUserName().trim();
        const email = this.newUserEmail().trim();
        this.#userService
            .create({
                name,
                email,
                password: this.newUserPassword(),
            })
            .subscribe({
                next: async (user: User) => {
                    if (this.#adminRoleId && user?.id) {
                        await this.#roleService.assignRole(this.#adminRoleId, user.id);
                    }
                    this.addedUsers.update((users) => [...users, { name, email }]);
                    this.newUserName.set('');
                    this.newUserEmail.set('');
                    this.newUserPassword.set('');
                    this.addUserLoading.set(false);
                },
                error: () => {
                    this.addUserError.set($localize`:@@i18n.onboarding.wizard.addUserError:Could not create user. The e-mail may already be in use.`);
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
