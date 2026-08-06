import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { SmartLinkDirective } from '@directives/smart-link.directive';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { Serializable } from '@models/_core/serializable';

@Component({
    selector: 'avatar',
    templateUrl: './avatar.component.html',
    styleUrls: ['./avatar.component.scss'],
    imports: [SmartLinkDirective, NgbTooltipModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarComponent {
    size = input<string>('sm');
    object = input<Serializable | undefined>(undefined);

    readonly routerLink = computed(() => this.object()?.frontendUrl() ?? '');
    readonly tooltip = computed(() => this.object()?.getTooltip() ?? '');
    readonly src = computed(() => this.object()?.getAvatar() ?? '');

    readonly badgeTooltip = computed(() => {
        const badge = this.object()?.getBadge();
        if (!badge) return '';
        if (badge[1].length > 2) return badge[1];
        if (badge[0].includes('danger')) return $localize`:@@i18n.common.requiresAttention:requires attention`;
        if (badge[0].includes('warning')) return $localize`:@@i18n.common.requiresReview:requires review`;
        return $localize`:@@i18n.common.markedForAttention:marked for attention`;
    });
}
