import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { tracked } from '@constants/tracked';
import { switchMap } from 'rxjs';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { InputSettingsGroupComponent } from '@shards/input-group/input-settings-group.component';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { TextParamEditorComponent } from '@shards/text-param-editor/text-param-editor.component';
import { Toast } from '@shards/toast/toast';
import { typeahead } from '@constants/constants';
import { Company } from '@models/company/company.model';
import { CompanyService } from '@models/company/company.service';
import { ParamService } from '@models/param.service';

@Component({
    selector: 'app-settings-general',
    templateUrl: './settings-general.component.html',
    styleUrls: ['./settings-general.component.scss'],
    standalone: true,
    imports: [ScrollbarComponent, InputSettingsGroupComponent, TextParamEditorComponent, SearchInputComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsGeneralComponent {
    tab = signal(0);
    cLanguage = signal<{ key: string; name: string }[]>([]);
    cCountry = signal<{ key: string; name: string }[]>([]);
    cCurrency = signal<{ key: string; name: string }[]>([]);
    protected readonly _me = signal<Company | null>(null);
    readonly me = tracked(this._me);

    #paramService = inject(ParamService);
    #companyService = inject(CompanyService);

    constructor() {
        Promise.all([import('src/constants/iso0639-1'), import('src/constants/iso3166'), import('src/constants/iso4217')]).then(([lang, country, currency]) => {
            this.cLanguage.set(typeahead(lang.LANGUAGE_CODES, 'alpha2', 'English'));
            this.cCountry.set(typeahead(country.COUNTRY_CODES, 'alpha-2', 'name'));
            this.cCurrency.set(typeahead(currency.CURRENCY_CODES, 'AlphabeticCode', 'Currency'));
        });
        this.#paramService
            .show('params/ME_ID')
            .pipe(switchMap((me) => this.#companyService.show(me.value as string)))
            .subscribe((company) => this._me.set(company));
    }

    onCompanyChanged(_: any) {
        if ('id' in _) {
            this.#paramService.update('params/ME_ID', { value: _.id }).subscribe(() => Toast.info('Company ID updated'));
            this._me.set(_);
        }
    }
}
