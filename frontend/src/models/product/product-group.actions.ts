import { NxAction } from "src/app/nx/nx.actions"
import { ProductGroup } from "./product-group.model"
import { NxGlobal } from "src/app/nx/nx.global"

export function getProductGroupActions(self: ProductGroup): NxAction[] {
    return [
        { title: $localize`:@@i18n.common.open:open`, action: () => self.navigate(self.frontendUrl()) },
        { title: $localize`:@@i18n.common.setDeprecated:set deprecated`, on: () => self.is_active, group: true, action: () => self.put('deprecate') },
        { title: $localize`:@@i18n.products.setActive:setActive`, on: () => !self.is_active, group: true, action: () => self.put('activate') },
        NxGlobal.deleteAction(self, $localize`:@@i18n.products.reallyDeleteThisProductGroup:really delete this product group?`, { roles: 'product_manager' }),
    ]
}
