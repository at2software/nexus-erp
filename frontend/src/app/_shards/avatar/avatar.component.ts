
import { Component, inject, Input, OnInit } from '@angular/core';
import { SmartLinkDirective } from '@directives/smart-link.directive';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { CompanyContact } from 'src/models/company/company-contact.model';
import { Company } from 'src/models/company/company.model';
import { GlobalService } from 'src/models/global.service';
import { Invoice } from 'src/models/invoice/invoice.model';
import { Project } from 'src/models/project/project.model';
import { User } from 'src/models/user/user.model';

@Component({
    selector: 'avatar',
    templateUrl: './avatar.component.html',
    styleUrls: ['./avatar.component.scss'],
    imports: [SmartLinkDirective, NgbTooltipModule],
    standalone: true
})
export class AvatarComponent implements OnInit {
    @Input() size: string = 'sm'
    @Input() object?: {id:string, name:string, icon:string, badge:undefined|[string, string]}|undefined

    routerLink: string = ''
    tooltip: string = ''
    src:string = ''
    badgeTooltip: string = ''

    global = inject(GlobalService)

    ngOnInit() {
        if (this.object instanceof User) {
            this.routerLink = this.global.user?.hasAnyRole(['hr', 'project_manager']) ? '/hr/' + this.object.id : ''
            this.tooltip = this.object.name
            this.src = this.object.icon
        }
        if (this.object instanceof Company) {
            this.routerLink = '/customers/' + this.object.id
            this.tooltip = this.object.name
            this.src = this.object.icon
        }
        if (this.object instanceof Project) {
            this.routerLink = '/projects/' + this.object.id
            this.tooltip = this.object.name
            this.src = this.object.icon
        }
        if (this.object instanceof Invoice) {
            this.routerLink = '/customers/' + this.object.company_id
            this.tooltip = this.object.company?.name ?? 'Invoice'
            this.src = this.object.icon
        }
        if (this.object instanceof CompanyContact) {
            this.routerLink = '/customers/' + this.object.company_id + '/cards'
            this.tooltip = this.object.name
            this.src = this.object.icon
        }

        // Set badge tooltip from object
        if (this.object?.badge) {
            this.badgeTooltip = this.object.badge[1] || ''

            // Only provide fallback tooltip if tooltip is very short (1-2 chars) or empty
            if (this.badgeTooltip.length <= 2) {
                const badgeClass = this.object.badge[0]
                if (badgeClass.includes('danger')) {
                    this.badgeTooltip = $localize`:@@i18n.common.requiresAttention:requires attention`
                } else if (badgeClass.includes('warning')) {
                    this.badgeTooltip = $localize`:@@i18n.common.requiresReview:requires review`
                } else {
                    this.badgeTooltip = $localize`:@@i18n.common.markedForAttention:marked for attention`
                }
            }
        }
    }
}
