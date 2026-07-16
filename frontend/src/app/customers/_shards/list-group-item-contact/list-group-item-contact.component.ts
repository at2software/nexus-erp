import { ChangeDetectionStrategy, Component, computed, effect, input, signal, untracked } from '@angular/core';
import { VcardClass } from '@models/vcard/VcardClass';
import { User } from '@models/user/user.model';
import { Company } from '@models/company/company.model';
import { CompanyContact } from '@models/company/company-contact.model';
import { PluginInstance } from '@models/http/plugin.instance';
import { NComponent } from '@shards/n/n.component';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';

interface PluginIcon {
    instance: PluginInstance;
    icon: string;
    iconClass: string;
    tooltip: string;
}

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'list-group-item-contact',
    templateUrl: './list-group-item-contact.component.html',
    styleUrls: ['./list-group-item-contact.component.scss'],
    host: { 
        class: 'list-group-item hstack align-items-center gap-2 py-1 px-2', 
        '[class.active]': 'active()' 
    },
    imports: [NComponent, AvatarComponent, NgbTooltipModule],
})
export class ListGroupItemContactComponent {
    contact = input.required<VcardClass>();
    role = input<string>();
    roleColor = input('muted');
    imageUrl = input<string>();
    primary = input(false);
    badgeColor = input<string>();
    active = input(false);
    showQuickContact = input(true);
    subject = input('');

    isUser = computed(() => this.contact() instanceof User);
    isCompany = computed(() => this.contact() instanceof Company);
    isCompanyContact = computed(() => this.contact() instanceof CompanyContact);
    asUser = computed(() => this.contact() as User);
    asCompany = computed(() => this.contact() as Company);
    asCompanyContact = computed(() => this.contact() as CompanyContact);
    hasImage = computed(() => this.isUser() || this.isCompany() || this.isCompanyContact() || this.imageUrl() !== undefined);

    linkedInstances = computed(() => this.contact()?.getLinkedInstances() ?? []);

    // PluginInstance state (connection, user roster) is plain mutable state, not signal-based.
    // Re-subscribing to each instance's `init` and bumping this tick is what invalidates `icons` below.
    #tick = signal(0);
    // `inst.init` is a ReplaySubject(1): if already connected, subscribe() replays synchronously while
    // this effect is still running. `untracked` keeps that write from also registering as a *read*
    // dependency of this same effect (which would otherwise re-trigger itself forever).
    #trackInstances = effect((onCleanup) => {
        const subs = this.linkedInstances().map((inst) => inst.init.subscribe(() => untracked(() => this.#tick.update((v) => v + 1))));
        onCleanup(() => subs.forEach((s) => s.unsubscribe()));
    });

    // Plain method, not computed(): a computed here would make the icon list part of the signal
    // graph alongside #tick and linkedInstances, which previously produced a self-triggering cycle.
    // Calling #tick() directly registers this view as a consumer so it re-renders on each tick,
    // while the icon data itself is recomputed fresh on every call (cheap, and always current).
    icons(): PluginIcon[] {
        this.#tick();
        const contact = this.contact();
        if (!contact) return [];
        return this.linkedInstances()
            .map((instance) => ({ instance, icon: instance.icon(), iconClass: contact.getInstanceIconClass(instance), tooltip: contact.getInstanceTooltip(instance) }))
            .filter((_) => _.iconClass);
    }

    encodedSubject = computed(() => encodeURIComponent(this.subject()));

    trimmed = (p: string) => p.replace(/[\s,\\/-]/gi, '');
    whatsapp = (p: string) => this.trimmed(p).replace(/^\\+/gi, '');

    toggleFav(event?: Event) {
        event?.stopPropagation();
        this.contact().update({ is_favorite: !this.asCompanyContact().is_favorite }).subscribe();
    }

    openProfile(instance: PluginInstance, event: Event) {
        event.preventDefault();
        event.stopPropagation();
        this.contact()?.openProfileFor(instance);
    }

    openWhatsAppWeb(phone: string) {
        window.open(`https://web.whatsapp.com/send/?phone=${phone}&text&type=phone_number&app_absent=0`, 'whatsappweb');
    }
}
