import { Pipe, PipeTransform } from '@angular/core';
import { short } from 'src/constants/short';

@Pipe({
    name: 'short',
    standalone: true
})
export class ShortPipe implements PipeTransform {

  transform(value: number): string {
    return ShortPipe.shorten(value)
  }

  static shorten = (value: number):string => short(value)
}
