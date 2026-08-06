import { ChangeDetectionStrategy, Component, inject, linkedSignal, signal } from '@angular/core';
import { tracked } from '@constants/tracked';
import { switchMap } from 'rxjs';
import { modelResource } from '@models/http/model-resource';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { InputSettingsGroupComponent } from '@shards/input-group/input-settings-group.component';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { TextParamEditorComponent } from '@shards/text-param-editor/text-param-editor.component';
import { Toast } from '@shards/toast/toast';
import { typeahead } from '@constants/constants';
import { Company } from '@models/company/company.model';
import { Serializable } from '@models/_core/serializable';
import { CompanyService } from '@models/company/company.service';
import { ParamService } from '@models/param/param.service';
import { Param } from '@models/param/param.model';

@Component({
    selector: 'app-settings-general',
    templateUrl: './settings-general.component.html',
    imports: [ScrollbarComponent, InputSettingsGroupComponent, TextParamEditorComponent, SearchInputComponent],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsGeneralComponent {
    tab = signal(0);
    cLanguage = signal<{ key: string; name: string }[]>([]);
    cCountry = signal<{ key: string; name: string }[]>([]);
    cCurrency = signal<{ key: string; name: string }[]>([]);
    #paramService = inject(ParamService);
    #companyService = inject(CompanyService);

    readonly #company = modelResource(() => this.#paramService.show('params/ME_ID').pipe(switchMap((me) => this.#companyService.show(me.value as string))));
    protected readonly _me = linkedSignal<Company | null>(() => this.#company.value() ?? null);
    readonly me = tracked(this._me);

    constructor() {
        Promise.all([import('@constants/iso/iso0639-1'), import('@constants/iso/iso3166'), import('@constants/iso/iso4217')]).then(([lang, country, currency]) => {
            this.cLanguage.set(typeahead(lang.LANGUAGE_CODES, 'alpha2', 'English'));
            this.cCountry.set(typeahead(country.COUNTRY_CODES, 'alpha-2', 'name'));
            this.cCurrency.set(typeahead(currency.CURRENCY_CODES, 'AlphabeticCode', 'Currency'));
        });
    }

    onCompanyChanged(selected: Serializable) {
        const company = selected.assert(Company);
        if (!company) return;
        Param.write('params/ME_ID', company.id).subscribe(() => Toast.info('Company ID updated'));
        this._me.set(company);
    }
}
