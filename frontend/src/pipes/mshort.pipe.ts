import { GlobalService } from '@models/global.service';
import { inject, Pipe, PipeTransform } from '@angular/core';
import { ShortPipe } from './short.pipe';

@Pipe({
    name: 'mshort',
})
export class MoneyShortPipe implements PipeTransform {
    #global: GlobalService = inject(GlobalService);

    #language = () => this.#global.setting('SYS_LANGUAGE') ?? '';
    #country = () => this.#global.setting('SYS_COUNTRY') ?? '';
    #symbol = () => this.#global.setting('SYS_CURRENCY') ?? '';

    getCurrencySymbol = (locale: string, currency: string) => (0).toLocaleString(locale, { style: 'currency', currency, minimumFractionDigits: 0, maximumFractionDigits: 0 }).replace(/\d/g, '').trim();

    transform(value: number | null | undefined): string {
        const amount = value ?? NaN;
        if (!this.#global.loaded()) {
            return ShortPipe.shorten(amount) + ' ' + this.getCurrencySymbol('en-UK', 'EUR');
        }
        let locale = this.#language() + '-' + this.#country();
        let symbol = this.#symbol();
        if (locale === '-') {
            locale = this.#global.locale;
        }
        if (symbol == '') {
            symbol = 'EUR';
        }
        return ShortPipe.shorten(amount) + ' ' + this.getCurrencySymbol(locale, symbol);
    }
}
