import { ChangeDetectionStrategy, Component, HostBinding, input, OnInit } from '@angular/core';

@Component({
    selector: 'empty-state',
    templateUrl: './empty-state.component.html',
    styleUrls: ['./empty-state.component.scss'],
    standalone: true,
    imports: [],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmptyStateComponent implements OnInit {
    title = input<string | undefined>();
    card = input<boolean>();
    class = input<string | undefined>();
    size = input<number>();
    @HostBinding('class') cardClass = '';
    ngOnInit = () => (this.cardClass = this.card() ? 'card' : '');
}
