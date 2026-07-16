import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

@Component({
    selector: 'empty-state',
    templateUrl: './empty-state.component.html',
    styleUrls: ['./empty-state.component.scss'],
    imports: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
    host: {
        '[class]': 'cardClass()',
    },
})
export class EmptyStateComponent {
    title = input<string | undefined>();
    card = input<boolean>();
    class = input<string | undefined>();
    size = input<number>();
    cardClass = computed(() => this.card() ? 'card' : '');
}
