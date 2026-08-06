import { NxAction } from '@models/_core/nx.actions';
import { Product } from './product.model';
import { nx } from '@models/_core/nx-bridge';

export function getProductActions(self: Product): NxAction[] {
    return [{ title: $localize`:@@i18n.common.open:open`, doubleClick: true, action: () => self.navigateTo(self.frontendUrl()) }, { title: $localize`:@@i18n.common.setDeprecated:set deprecated`, on: () => self.is_active, group: true, action: () => self.put('deprecate') }, { title: $localize`:@@i18n.common.setActive:set active`, on: () => !self.is_active, group: true, action: () => self.put('activate') }, nx().deleteAction(self, $localize`:@@i18n.products.reallyDeleteThisProduct:really delete this product?`, { roles: 'product_manager' })];
}
