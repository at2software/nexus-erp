import { NxAction } from '@models/_core/nx.actions';
import { ProductGroup } from './product-group.model';
import { nx } from '@models/_core/nx-bridge';

export function getProductGroupActions(self: ProductGroup): NxAction[] {
    return [{ title: $localize`:@@i18n.common.open:open`, doubleClick: true, action: () => self.navigateTo(self.frontendUrl()) }, { title: $localize`:@@i18n.common.setDeprecated:set deprecated`, on: () => self.is_active, group: true, action: () => self.put('deprecate') }, { title: $localize`:@@i18n.products.setActive:setActive`, on: () => !self.is_active, group: true, action: () => self.put('activate') }, nx().deleteAction(self, $localize`:@@i18n.products.reallyDeleteThisProductGroup:really delete this product group?`, { roles: 'product_manager' })];
}
