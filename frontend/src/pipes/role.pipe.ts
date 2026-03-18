import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
    name: 'role',
    standalone: true
})
export class RolePipe implements PipeTransform {

  transform(value: string): string {
    return value.split("_")
				.join(" ")
				.toLowerCase()
				.split(' ')
				.map(word => word.charAt(0).toUpperCase() + word.slice(1))
				.join(' ');
  }

}
