import { Component, Input } from '@angular/core';

@Component({
    selector: 'file',
    templateUrl: './file.component.html',
    styleUrls: ['./file.component.scss'],
    standalone: true
})
export class FileComponent {
    @Input() color:string
    @Input() size:number = 64
    getWidth = () => this.size * .75
}
