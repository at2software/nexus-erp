import { NxAction } from "src/app/nx/nx.actions"
import { InvoiceItem } from "./invoice-item.model"
import { InvoiceItemService } from "./invoice-item.service"
import { InvoiceItemType } from "src/enums/invoice-item.type"
import { REPEATING_MULT } from "../expense/expense.model"
import { NxGlobal } from "src/app/nx/nx.global"
import { ModalCombineInvoiceItemsComponent } from "@app/_modals/modal-combine-invoice-items/modal-combine-invoice-items.component"
import { ModalBaseService } from "@app/_modals/modal-base-service"

export function getInvoiceItemActions(self: InvoiceItem): NxAction[] {
    return [
        { title: $localize`:@@i18n.common.edit:edit`, action: (success?: (v: any) => void, nxContext?: any) => self.onEdit(success, nxContext) },
        {
            title: $localize`:@@i18n.common.changeTo:change to...`, group: true, children: [
                { title: $localize`:@@i18n.common.active:active`, hotkey: 'CTRL+ALT+1', group: true, on: () => (self.type < 3), action: () => self.update({ type: InvoiceItemType.Default }), },
                { title: $localize`:@@i18n.common.inactive:inactive`, hotkey: 'CTRL+ALT+2', group: true, on: () => (self.type < 3), action: () => self.update({ type: InvoiceItemType.Inactive }), },
                { title: $localize`:@@i18n.invoices.optional:optional`, hotkey: 'CTRL+ALT+3', group: true, on: () => (self.type < 3), action: () => self.update({ type: InvoiceItemType.Optional }), },
                { title: $localize`:@@i18n.common.discount:discount`, hotkey: 'CTRL+ALT+4', group: true, on: () => (self.type < 3 && self.qty < 0), action: () => self.update({ type: InvoiceItemType.Discount }), },
            ]
        },
        //{ title: 'go to project', context:'', on: () => (this.project_id ? true : false), action: () => this.navigate('projects/' + this.project_id) },
        ...NxGlobal.clipboardActions(self, '!clipboard'),
        {
            title: $localize`:@@i18n.common.selectAll:select all...`, on: () => self.type in REPEATING_MULT, children: [
                { title: $localize`:@@i18n.common.ofCustomer:...of customer`, hotkey: 'CTRL+ALT+C', action: () => self.nxSelect((_: InvoiceItem) => _.company_id == self.company_id) }
            ]
        },
        {
            title: $localize`:@@i18n.invoices.combine:combine`,
            group: true,
            hotkey: 'CTRL+ALT+M',
            on: () => canCombineSelectedItems(),
            action: (success) => combineSelectedItems(self, success)
        },
        ...self.markerActions(),
        NxGlobal.deleteAction(self, $localize`:@@i18n.invoices.reallyDeleteThisInvoiceItem:really delete this invoice item?`, { roles: 'invoicing|financial|project_manager' }),
    ]
}

/**
 * Check if the currently selected items can be combined.
 * Items can be combined if:
 * - There are at least 2 items selected
 * - All items have the same price and unit_name
 * - All items are regular items (not headers, discounts, etc.)
 */
function canCombineSelectedItems(): boolean {
    const selected = NxGlobal.nxService.selected
    if (selected.length < 2) return false

    const items = selected.map(_ => _.nx as InvoiceItem)

    // Check all items are regular items
    if (!items.every(item => item.isRegularItem())) return false

    // Check all items have same price and unit_name
    const firstItem = items[0]
    return items.every(item =>
        item.price === firstItem.price &&
        item.unit_name === firstItem.unit_name
    )
}

/**
 * Combine the currently selected items into a single item.
 * Opens a modal to select the description for the combined item.
 * Uses backend endpoint to properly handle foci reassignment.
 */
function combineSelectedItems(self: InvoiceItem, success?: (v?: any) => void): void {
    const selected = NxGlobal.nxService.selected
    const items = selected.map(_ => _.nx as InvoiceItem)

    // Only execute on the first selected item to avoid multiple modals/calls
    if (items[0] !== self) return

    ModalBaseService.open(ModalCombineInvoiceItemsComponent, items)
        .then((result: { description: string }) => {
            if (!result) return

            const itemIds = items.map(item => item.id)
            const service = NxGlobal.getService(InvoiceItemService)

            service.combine(itemIds, result.description).subscribe(() => {
                // Call success callback to trigger singleActionResolved
                success?.()
            })
        })
        .catch(() => {
            // Modal dismissed
        })
}
