import { ChangeDetectionStrategy, Component, effect, inject, input, Signal } from '@angular/core';
import { SmartLinkDirective } from '@directives/smart-link.directive';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CompanyContact } from '@models/company/company-contact.model';
import { Company } from '@models/company/company.model';
import { GlobalService } from '@models/global.service';
import { Invoice } from '@models/invoice/invoice.model';
import { Project } from '@models/project/project.model';
import { User } from '@models/user/user.model';

@Component({
    selector: 'avatar',
    templateUrl: './avatar.component.html',
    styleUrls: ['./avatar.component.scss'],
    imports: [SmartLinkDirective, NgbTooltipModule],
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AvatarComponent {
    size = input<string>('sm');
    object = input<{ id: string; getName: ()=>string; icon: string; badge: Signal<[string, string] | undefined> } | undefined>(undefined);

    routerLink: string = '';
    tooltip: string = '';
    src: string = '';
    badgeTooltip: string = '';

    global = inject(GlobalService);

    constructor() {
        effect(() => {
            const object = this.object();
            this.routerLink = '';
            this.tooltip = '';
            this.src = '';
            this.badgeTooltip = '';

            if (object instanceof User) {
                this.routerLink = this.global.user?.hasAnyRole(['hr', 'project_manager']) ? '/hr/' + object.id : '';
                this.tooltip = object.getName();
                this.src = object.icon;
            }
            if (object instanceof Company) {
                this.routerLink = '/customers/' + object.id;
                this.tooltip = object.getName();
                this.src = object.icon;
            }
            if (object instanceof Project) {
                this.routerLink = '/projects/' + object.id;
                this.tooltip = object.getName();
                this.src = object.icon;
            }
            if (object instanceof Invoice) {
                this.routerLink = '/customers/' + object.company_id;
                this.tooltip = object.company?.getName() ?? 'Invoice';
                this.src = object.icon;
            }
            if (object instanceof CompanyContact) {
                this.routerLink = '/customers/' + object.company_id + '/cards';
                this.tooltip = object.getName();
                this.src = object.icon;
            }

            const badge = object?.badge();
            if (badge) {
                this.badgeTooltip = badge[1] || '';
                if (this.badgeTooltip.length <= 2) {
                    const badgeClass = badge[0];
                    if (badgeClass.includes('danger')) {
                        this.badgeTooltip = $localize`:@@i18n.common.requiresAttention:requires attention`;
                    } else if (badgeClass.includes('warning')) {
                        this.badgeTooltip = $localize`:@@i18n.common.requiresReview:requires review`;
                    } else {
                        this.badgeTooltip = $localize`:@@i18n.common.markedForAttention:marked for attention`;
                    }
                }
            }
        });
    }
}
