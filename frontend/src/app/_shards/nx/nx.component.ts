import { Component, input } from '@angular/core';
import { Serializable } from 'src/models/serializable';


// TODO: is this really useful or can we remove it?
@Component({
    selector: 'nx',
    templateUrl: './nx.component.html',
    styleUrls: ['./nx.component.scss'],
    host: { class: 'list-group-item d-flex text-nowrap nx' },
    standalone: true
})
export class NxComponent {
    nx = input<Serializable>()
    title = input<string>()
}
