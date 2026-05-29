import { ChangeDetectionStrategy, Component, contentChildren, effect, input, signal } from '@angular/core';
import { SafePipe } from '@pipes/safe.pipe';
import { CompactItemDirective } from './CompactItemDirective';

@Component({
    selector: 'ul-compact',
    templateUrl: './ul-compact.component.html',
    styleUrls: ['./ul-compact.component.scss'],
    standalone: true,
    imports: [SafePipe],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UlCompactComponent {
    badge = input<string>();
    compacted: boolean = true;
    hasCompactItems = signal(false);
    items = contentChildren(CompactItemDirective, { descendants: true });

    constructor() {
        effect(() => {
            const list = this.items();
            this.hasCompactItems.set(list.length > 0);
        });
    }

    toggle = () => (this.compacted = !this.compacted);
}