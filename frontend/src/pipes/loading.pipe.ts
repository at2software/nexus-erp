import { Pipe, PipeTransform } from '@angular/core';

// potential loading ascii characters
// ░▒▓ █▄▀■

@Pipe({
    name: 'loading',
    standalone: true
})
export class LoadingPipe implements PipeTransform {

    transform(value: any, length?:number, suffix?:string, ascii:string = '■'): any {
        suffix = suffix || ''
        if (!value) {
            return ascii.repeat(length ? length : 3);
        }
        else {
            const fixed = value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })
            return fixed + suffix;
        }
    }
}