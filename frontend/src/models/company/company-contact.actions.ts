import { NxAction, NxActionType } from "src/app/nx/nx.actions"
import { CompanyContact } from "./company-contact.model"
import { NxGlobal } from "src/app/nx/nx.global"
import { ModalConfirmComponent } from "@app/_modals/modal-confirm/modal-confirm.component"

export function getCompanyContactActions(self: CompanyContact): NxAction[] {
    return [
        { title: $localize`:@@i18n.common.edit:edit`, action: () => self.navigate(self.frontendUrl()) },
        {
            title: $localize`:@@i18n.mantis.link_to_mantisbt_user:link to MantisBT user`,
            group: true,
            action: () => self.linkToMantisUser(),
            on: () => self.canLinkToMantis()
        },
        { title: $localize`:@@i18n.common.retire:retire`, group: true, action: () => self.update({ is_retired: true }).subscribe(), roles: 'hr' },
        { title: $localize`:@@i18n.companies.setFavorite:set favorite`, group: true, action: () => self.update({ is_favorite: true }).subscribe(), on: () => !self.is_favorite },
        { title: $localize`:@@i18n.companies.setAsDefaultContact:set as default contact`, group: true, action: () => NxGlobal.service.put(`companies/${self.company_id}`, { default_contact_id: self.id }).subscribe() },
        { title: $localize`:@@i18n.companies.setAsInvoiceContact:set as invoice contact`, group: true, action: () => NxGlobal.service.put(`companies/${self.company_id}`, { default_invoicee_id: self.id }).subscribe() },
        { title: $localize`:@@i18n.companies.unsetFavorite:unset favorite`, group: true, action: () => self.update({ is_favorite: false }).subscribe(), on: () => self.is_favorite },
        {
            title: $localize`:@@i18n.common.delete:delete`,
            interrupt: { service: ModalConfirmComponent, args: { message: $localize`:@@i18n.companies.reallyDeleteThisContact:really delete this contact?`, title: $localize`:@@i18n.common.attention:attention` } },
            action: () => self.delete(),
            type: NxActionType.Destructive,
            group: true,
            hotkey: 'CTRL+DELETE',
            roles: 'admin'
        },
    ]
}
