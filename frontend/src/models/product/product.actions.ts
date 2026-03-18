import { NxAction, NxActionType } from "src/app/nx/nx.actions"
import { Product } from "./product.model"
import { ModalConfirmComponent } from "@app/_modals/modal-confirm/modal-confirm.component"

export function getProductActions(self: Product): NxAction[] {
    return [
        { title: $localize`:@@i18n.common.open:open`, action: () => self.navigate(self.frontendUrl()) },
        { title: $localize`:@@i18n.common.setDeprecated:set deprecated`, on: () => self.is_active, group: true, action: () => self.put('deprecate') },
        { title: $localize`:@@i18n.common.setActive:set active`, on: () => !self.is_active, group: true, action: () => self.put('activate') },
        {
            title: $localize`:@@i18n.common.delete:delete`,
            interrupt: { service: ModalConfirmComponent, args: { message: $localize`:@@i18n.products.reallyDeleteThisProduct:really delete this product?`, title: $localize`:@@i18n.common.attention:attention` } },
            action: () => self.delete(),
            type: NxActionType.Destructive,
            group: true,
            hotkey: 'CTRL+DELETE',
            roles: 'product_manager'
        },
    ]
}
