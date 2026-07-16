import { ChangeDetectionStrategy, Component, effect, inject, input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GlobalService } from '@models/global.service';

@Component({
    selector: 'header-link-item',
    templateUrl: './header-link-item.component.html',
    styleUrls: ['./header-link-item.component.scss'],
    host: { class: 'nav-item capitalize d-flex', 'tab-index': '-1' },
    imports: [RouterModule],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderLinkItemComponent {
    routerLink = input<string>();
    ngbTooltip = input<string>();
    roles = input<string>();
    title = input<string>();
    exact = input(true);
    active = input<boolean>();

    rolesAllowed: boolean = true;
    global = inject(GlobalService);
    routerLinkActiveOptions = { exact: false };

    constructor() {
        effect(() => {
            this.routerLinkActiveOptions.exact = this.routerLink() == '.';
            const roles = this.roles();
            if (!roles) {
                this.rolesAllowed = true;
                return;
            }
            const requiredRoles = roles.split('|');
            this.rolesAllowed = this.global.user?.hasAnyRole(requiredRoles) || false;
        });
    }
}
