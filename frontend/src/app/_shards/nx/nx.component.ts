import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Serializable } from '@models/_core/serializable';

// TODO: is this really useful or can we remove it?
@Component({
    selector: 'nx',
    templateUrl: './nx.component.html',
    host: { class: 'list-group-item d-flex text-nowrap nx' },
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NxComponent {
    nx = input<Serializable>();
    title = input<string>();
}
