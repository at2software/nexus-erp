import { Component, input, model } from '@angular/core';


@Component({
    selector: 'spinner',
    standalone: true,
    imports: [],
    templateUrl: './spinner.component.html',
    styleUrl: './spinner.component.scss'
})
export class SpinnerComponent {
    size = input<number>(48)
    centered = input<boolean>(true)
    visible = model<boolean>(true)

    show() { this.visible.set(true) }
    hide() { this.visible.set(false) }
}