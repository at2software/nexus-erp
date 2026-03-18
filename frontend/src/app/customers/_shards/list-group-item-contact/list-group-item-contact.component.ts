import { Component, HostBinding, Input, OnChanges } from '@angular/core';
import { VcardClass } from 'src/models/vcard/VcardClass';
import { User } from 'src/models/user/user.model';
import { CompanyContact } from 'src/models/company/company-contact.model';
import { MantisPlugin } from '@models/http/plugin.mantis';
import { GitLabPlugin } from '@models/http/plugin.gitlab';
import { MattermostPlugin } from '@models/http/plugin.mattermost';

import { NexusModule } from '@app/nx/nexus.module';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
    selector: 'list-group-item-contact',
    templateUrl: './list-group-item-contact.component.html',
    styleUrls: ['./list-group-item-contact.component.scss'],
    host: { class: 'list-group-item d-flex py-1 px-2 align-items-center gap-2' },
    standalone: true,
    imports: [NexusModule, NgbTooltipModule]
})
export class ListGroupItemContactComponent implements OnChanges {

    @Input() role: string
    @Input() roleColor: string = 'muted'
    @Input() imageUrl: string | undefined = undefined
    @Input() primary: boolean = false
    @Input() contact: VcardClass
    @Input() badgeColor: string
    @Input() active: boolean = false
    @Input() showQuickContact: boolean = true
    @Input() subject:string = ''
    @Input() mantisInstance: any = undefined
    @Input() gitInstance: any = undefined
    @Input() mattermostInstance: any = undefined

    @HostBinding('class.active') get _active() { return this.active; };

    hasImage = () => this.imageUrl !== undefined

    ngOnChanges() {
        if (this.contact) {
            if (this.isUser()) this.imageUrl = this.contact.icon
        }
    }
    isUser = () => this.contact instanceof User
    isCompanyContact = () => this.contact instanceof CompanyContact
    asUser = () => this.contact as User
    asCompanyContact = () => this.contact as CompanyContact
    trimmed = (p: string): string => p.replace(/[\s,\\/-]/ig, '')
    whatsapp = (p: string): string => this.trimmed(p).replace(/^\\+/ig, '')
    getEncodedSubject = () => encodeURIComponent(this.subject)

    toggleFav = (event?: Event) => {
        event?.stopPropagation()
        this.contact.update({ is_favorite: !this.asCompanyContact().is_favorite }).subscribe()
    }

    getMantisUserId = (): string | undefined => this.contact?.getUserIdForPlugin?.('X-NEXUS-MANTISBT')
    getMantisIconClass = () => this.contact?.getInstanceIconClass(this.mantisInstance) || ''
    getMantisTooltip = () => this.contact?.getInstanceTooltip(this.mantisInstance) || ''

    openMantisProfile = (event: Event) => {
        event.preventDefault()
        event.stopPropagation()
        this.contact?.openProfile(MantisPlugin)
    }

    // Git integration methods
    getGitUsername = (): string | undefined => this.contact?.getUserIdForPlugin?.('X-NEXUS-GIT')
    getGitIconClass = () => this.contact?.getInstanceIconClass(this.gitInstance) || ''
    getGitTooltip = () => this.contact?.getInstanceTooltip(this.gitInstance) || ''

    openGitProfile = (event: Event) => {
        event.preventDefault()
        event.stopPropagation()
        this.contact?.openProfile(GitLabPlugin)
    }

    // Mattermost integration methods
    getMattermostUserId = (): string | undefined => this.contact?.getUserIdForPlugin?.('X-NEXUS-MATTERMOST')
    getMattermostIconClass = () => this.contact?.getInstanceIconClass(this.mattermostInstance) || ''
    getMattermostTooltip = () => this.contact?.getInstanceTooltip(this.mattermostInstance) || ''

    openMattermostProfile = (event: Event) => {
        event.preventDefault()
        event.stopPropagation()
        this.contact?.openProfile(MattermostPlugin)
    }

    openWhatsAppWeb(phone: string) {
        const url = `https://web.whatsapp.com/send/?phone=${phone}&text&type=phone_number&app_absent=0`;
        window.open(url, 'whatsappweb');
    }
}
