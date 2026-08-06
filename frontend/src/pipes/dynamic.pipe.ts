import { inject, Injector, Pipe, PipeTransform, ProviderToken } from '@angular/core';

@Pipe({
    name: 'dynamicPipe',
})
export class DynamicPipe implements PipeTransform {
    injector: Injector = inject(Injector);

    transform(value: unknown, pipeToken: ProviderToken<PipeTransform> | null | undefined): unknown {
        if (!pipeToken) {
            return value;
        } else {
            const pipe = this.injector.get(pipeToken);
            return pipe.transform(value);
        }
    }
}
