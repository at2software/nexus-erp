
import { Component, inject, input, OnInit } from '@angular/core';
import { RouterModule } from '@angular/router';
import { GlobalService } from '@models/global.service';

@Component({
    selector: 'header-link-item',
    templateUrl: './header-link-item.component.html',
    styleUrls: ['./header-link-item.component.scss'],
    host: { class: 'nav-item capitalize d-flex', 'tab-index': "-1" },
    standalone: true,
    imports: [RouterModule]
})
export class HeaderLinkItemComponent implements OnInit {

    routerLink = input<string>()
    ngbTooltip  = input<string>()
    roles       = input<string>()
    title       = input<string>()
    exact       = input(true)
    active      = input<boolean>()

    rolesAllowed: boolean = true
    global = inject(GlobalService)
    routerLinkActiveOptions = ({ exact: false })

    ngOnInit() {
        this.routerLinkActiveOptions.exact = this.routerLink() == '.'
        if (this.roles()) {
            const requiredRoles = this.roles()!.split('|')
            this.rolesAllowed = this.global.user?.hasAnyRole(requiredRoles) || false
        }
    }
}
