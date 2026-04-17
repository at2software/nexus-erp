import { Component, input } from '@angular/core';

@Component({
    selector: 'file',
    templateUrl: './file.component.html',
    styleUrls: ['./file.component.scss'],
    standalone: true
})
export class FileComponent {
    color = input<string|undefined>()
    size = input<number|undefined>()
    getWidth = () => this.size() ? this.size()! * .75 : 0
}
