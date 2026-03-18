import { Component, Input } from '@angular/core';


@Component({
    selector: 'spinner',
    standalone: true,
    imports: [],
    templateUrl: './spinner.component.html',
    styleUrl: './spinner.component.scss'
})
export class SpinnerComponent {
    @Input() size: number = 48
    @Input() centered: boolean = true
    visible: boolean = true

    show() {
        this.visible = true
    }

    hide() {
        this.visible = false
    }
}