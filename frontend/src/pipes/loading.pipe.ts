import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'loading',
})
export class LoadingPipe implements PipeTransform {
    transform(value: number | null | undefined, length?: number, suffix?: string, ascii: string = '■'): string {
        suffix = suffix || '';
        if (!value) {
            return ascii.repeat(length ? length : 3);
        } else {
            const fixed = value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
            return fixed + suffix;
        }
    }
}
