import {
    inject,
    Injector,
    Pipe,
    PipeTransform
} from '@angular/core';

@Pipe({
    name: 'dynamicPipe',
    standalone: true
})
export class DynamicPipe implements PipeTransform {

    injector: Injector = inject(Injector)

    transform(value: any, pipeToken: any): any {
        if (!pipeToken) {
            return value;
        }
        else {
            const pipe = this.injector.get(pipeToken) as PipeTransform;
            return pipe.transform(value);
        }
    }
}