import { NxAction } from "src/app/nx/nx.actions"
import { Product } from "./product.model"
import { NxGlobal } from "src/app/nx/nx.global"

export function getProductActions(self: Product): NxAction[] {
    return [
        { title: $localize`:@@i18n.common.open:open`, action: () => self.navigate(self.frontendUrl()) },
        { title: $localize`:@@i18n.common.setDeprecated:set deprecated`, on: () => self.is_active, group: true, action: () => self.put('deprecate') },
        { title: $localize`:@@i18n.common.setActive:set active`, on: () => !self.is_active, group: true, action: () => self.put('activate') },
        NxGlobal.deleteAction(self, $localize`:@@i18n.products.reallyDeleteThisProduct:really delete this product?`, { roles: 'product_manager' }),
    ]
}
