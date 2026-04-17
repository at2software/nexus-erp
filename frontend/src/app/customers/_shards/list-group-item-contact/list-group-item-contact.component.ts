import { Component, computed, input } from '@angular/core';
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
    host: { class: 'list-group-item d-flex py-1 px-2 align-items-center gap-2', '[class.active]': 'active()' },
    standalone: true,
    imports: [NexusModule, NgbTooltipModule]
})
export class ListGroupItemContactComponent {

    contact           = input.required<VcardClass>()
    role              = input<string>()
    roleColor         = input('muted')
    imageUrl          = input<string>()
    primary           = input(false)
    badgeColor        = input<string>()
    active            = input(false)
    showQuickContact  = input(true)
    subject           = input('')
    mantisInstance    = input<any>()
    gitInstance       = input<any>()
    mattermostInstance = input<any>()

    isUser           = computed(() => this.contact() instanceof User)
    isCompanyContact = computed(() => this.contact() instanceof CompanyContact)
    asUser           = computed(() => this.contact() as User)
    asCompanyContact = computed(() => this.contact() as CompanyContact)
    hasImage         = computed(() => this.isUser() || this.imageUrl() !== undefined)

    mantisUserId    = computed(() => this.contact()?.getUserIdForPlugin?.('X-NEXUS-MANTISBT'))
    mantisIconClass = computed(() => this.contact()?.getInstanceIconClass(this.mantisInstance()) || '')
    mantisTooltip   = computed(() => this.contact()?.getInstanceTooltip(this.mantisInstance()) || '')

    gitUsername  = computed(() => this.contact()?.getUserIdForPlugin?.('X-NEXUS-GIT'))
    gitIconClass = computed(() => this.contact()?.getInstanceIconClass(this.gitInstance()) || '')
    gitTooltip   = computed(() => this.contact()?.getInstanceTooltip(this.gitInstance()) || '')

    mattermostUserId    = computed(() => this.contact()?.getUserIdForPlugin?.('X-NEXUS-MATTERMOST'))
    mattermostIconClass = computed(() => this.contact()?.getInstanceIconClass(this.mattermostInstance()) || '')
    mattermostTooltip   = computed(() => this.contact()?.getInstanceTooltip(this.mattermostInstance()) || '')

    encodedSubject = computed(() => encodeURIComponent(this.subject()))

    trimmed  = (p: string) => p.replace(/[\s,\\/-]/ig, '')
    whatsapp = (p: string) => this.trimmed(p).replace(/^\\+/ig, '')

    toggleFav(event?: Event) {
        event?.stopPropagation()
        this.contact().update({ is_favorite: !this.asCompanyContact().is_favorite }).subscribe()
    }

    openMantisProfile(event: Event) {
        event.preventDefault()
        event.stopPropagation()
        this.contact()?.openProfile(MantisPlugin)
    }

    openGitProfile(event: Event) {
        event.preventDefault()
        event.stopPropagation()
        this.contact()?.openProfile(GitLabPlugin)
    }

    openMattermostProfile(event: Event) {
        event.preventDefault()
        event.stopPropagation()
        this.contact()?.openProfile(MattermostPlugin)
    }

    openWhatsAppWeb(phone: string) {
        window.open(`https://web.whatsapp.com/send/?phone=${phone}&text&type=phone_number&app_absent=0`, 'whatsappweb')
    }
}
