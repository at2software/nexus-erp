import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { describePhone, phoneLookups } from '@constants/phone';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'knownseq-caller-cards',
    templateUrl: './knownseq-caller-cards.component.html',
})
export class KnownseqCallerCardsComponent {
    number = input.required<string>();
    protected readonly info = computed(() => describePhone(this.number()));
    protected readonly lookups = computed(() => phoneLookups(this.number()));
}
