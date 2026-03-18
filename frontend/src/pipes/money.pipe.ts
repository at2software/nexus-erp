import { GlobalService } from 'src/models/global.service';
import { inject, Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'money',
    standalone: true
})
export class MoneyPipe implements PipeTransform {
    global = inject(GlobalService)
    
    #language = () => this.global.setting('SYS_LANGUAGE') ?? ''
    #country = () => this.global.setting('SYS_COUNTRY') ?? ''
    #symbol = () => this.global.setting('SYS_CURRENCY') ?? ''

    transform(value: any): string {
        if (!this.global?.loaded) {
            return Intl.NumberFormat('en-UK', { style: 'currency', currency: 'EUR' }).format(value)
        }
        let locale = this.#language() + '-' + this.#country()
        let symbol = this.#symbol()
        if (locale === '-') {
            locale = this.global.locale
        }
        if (symbol == '') {
            symbol = 'EUR'
        }
        return Intl.NumberFormat(locale, { style: 'currency', currency: symbol }).format(value)
    }
}
