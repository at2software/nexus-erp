
import { Component, input } from '@angular/core';
import { SafePipe } from 'src/pipes/safe.pipe';

@Component({
    selector: 'ul-compact',
    templateUrl: './ul-compact.component.html',
    styleUrls: ['./ul-compact.component.scss'],
    standalone: true,
    imports: [SafePipe]
})
export class UlCompactComponent {
    badge = input<string>();
    compacted:boolean = true
    toggle = () => this.compacted = !this.compacted
}