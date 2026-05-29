import { NxAction } from '@app/nx/nx.actions';
import { CompanyContact } from './company-contact.model';
import { NxGlobal } from '@app/nx/nx.global';

export function getCompanyContactActions(self: CompanyContact): NxAction[] {
    return [
        { title: $localize`:@@i18n.common.edit:edit`, action: () => self.navigateTo(self.frontendUrl()) },
        {
            title: $localize`:@@i18n.plugins.linkToPluginUser:link to plugin user`,
            group: true,
            on: () => self.getLinkableRootInstances().length > 0,
            children: () => self.getLinkableRootInstances().map((inst: any) => ({
                title: `link to ${inst.icon()} user`,
                action: () => self.linkToPlugin(inst),
            })),
        },
        { title: $localize`:@@i18n.common.retire:retire`, group: true, action: () => self.update({ is_retired: true }).subscribe(), roles: 'hr' },
        { title: $localize`:@@i18n.companies.setFavorite:set favorite`, group: true, action: () => self.update({ is_favorite: true }).subscribe(), on: () => !self.is_favorite },
        { title: $localize`:@@i18n.companies.setAsDefaultContact:set as default contact`, group: true, action: () => NxGlobal.service.put(`companies/${self.company_id}`, { default_contact_id: self.id }).subscribe() },
        { title: $localize`:@@i18n.companies.setAsInvoiceContact:set as invoice contact`, group: true, action: () => NxGlobal.service.put(`companies/${self.company_id}`, { default_invoicee_id: self.id }).subscribe() },
        { title: $localize`:@@i18n.companies.unsetFavorite:unset favorite`, group: true, action: () => self.update({ is_favorite: false }).subscribe(), on: () => self.is_favorite },
        NxGlobal.deleteAction(self, $localize`:@@i18n.companies.reallyDeleteThisContact:really delete this contact?`, { roles: 'admin' }),
    ];
}
