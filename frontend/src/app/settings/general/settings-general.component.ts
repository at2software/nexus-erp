
import { Component, inject, OnInit } from '@angular/core';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { InputSettingsGroupComponent } from '@shards/input-group/input-group.component';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { TextParamEditorComponent } from '@shards/text-param-editor/text-param-editor.component';
import { Toast } from '@shards/toast/toast';
import { typeahead } from 'src/constants/constants';
import { LANGUAGE_CODES } from 'src/constants/iso0639-1';
import { COUNTRY_CODES } from 'src/constants/iso3166';
import { CURRENCY_CODES } from 'src/constants/iso4217';
import { Company } from 'src/models/company/company.model';
import { CompanyService } from 'src/models/company/company.service';
import { ParamService } from 'src/models/param.service';

@Component({
    selector: 'app-settings-general',
    templateUrl: './settings-general.component.html',
    styleUrls: ['./settings-general.component.scss'],
    standalone: true,
    imports: [ScrollbarComponent, InputSettingsGroupComponent, TextParamEditorComponent, SearchInputComponent]
})
export class SettingsGeneralComponent implements OnInit {

    cLanguage = typeahead(LANGUAGE_CODES, 'alpha2', 'English')
    cCountry = typeahead(COUNTRY_CODES, 'alpha-2', 'name')
    cCurrency = typeahead(CURRENCY_CODES, 'AlphabeticCode', 'Currency')

    tab: number = 0
    show = (_: number) => { this.tab = _ }

    me: Company | null = null
    #paramService = inject(ParamService)
    #companyService = inject(CompanyService)

    ngOnInit() {
        this.#paramService.show('params/ME_ID').subscribe((me) => {
            this.#companyService.show(me.value as string).subscribe((company) => {
                this.me = company
            })
        })
    }
    onCompanyChanged(_:any) {
        if ('id' in _) {
            this.#paramService.update('params/ME_ID', {value: _.id}).subscribe(() => Toast.info('Company ID updated'))
            this.me = _
        }
    }
}
