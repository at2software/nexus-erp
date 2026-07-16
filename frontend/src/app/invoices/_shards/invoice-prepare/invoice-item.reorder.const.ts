import { CdkDragDrop } from '@angular/cdk/drag-drop';
import { deepCopy } from '@constants/deepClone';
import { InvoiceItemType } from '@enums/invoice-item.type';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { InvoiceItemService } from '@models/invoice/invoice-item.service';

export const reorderInvoiceItems = (items: InvoiceItem[], event: CdkDragDrop<InvoiceItem[]>, service: InvoiceItemService) => {
    const copy = deepCopy(items);
    const i = copy.splice(event.previousIndex, 1);
    copy.splice(event.currentIndex, 0, i[0]);
    const newOrder: string[] = [];
    copy.forEach((_: InvoiceItem, index: number) => {
        _.position = index;
        newOrder.push(_.id);
    });
    service.reorder(newOrder).subscribe();
    return copy;
};

const positionArray = (items: InvoiceItem[]) => items.map((_) => _.id);
export const moveInvoiceItems = (items: InvoiceItem[], fromIndex: number, toIndex: number): string[] => {
    const from = clamp(fromIndex, items.length - 1);
    const to = clamp(toIndex, items.length - 1);
    if (from === to) {
        return positionArray(items);
    }

    const target = items[from];
    const delta = to < from ? -1 : 1;

    for (let i = from; i !== to; i += delta) {
        items[i] = items[i + delta];
        items[i].position = i;
    }
    items[to] = target;
    return positionArray(items);
};

function clamp(value: number, max: number): number {
    return Math.max(0, Math.min(max, value));
}

interface VatEntry {
    title: string;
    value: number;
}

export const reindexInvoiceItems = (items: InvoiceItem[]): { items: InvoiceItem[]; net: number; gross: number; vat: VatEntry[] } => {
    const vatByRate: Record<string, VatEntry> = {};
    let pos = 0;
    let net = 0;
    let gross = 0;
    let currentGroup: InvoiceItem | undefined = undefined;
    for (const item of items) {
        if (item.hasNumbering()) {
            item.var.pos = ++pos;
        }
        if (item.willAddToSum()) {
            net += item.total;
            gross += item.gross;
            if (currentGroup) {
                currentGroup.var.sum += item.total;
                currentGroup.var.pt += item.pt;
            }
            if (!(item.vat_rate in vatByRate)) {
                vatByRate[item.vat_rate] = { title: '+ ' + item.vat_rate + '% VAT', value: 0 };
            }
            vatByRate[item.vat_rate].value += item.vat;
        } else {
            if (item.type == InvoiceItemType.Header) {
                currentGroup = item;
                currentGroup.var.sum = 0;
                currentGroup.var.pt = 0;
            }
        }
    }
    const vat = Object.values(vatByRate);
    return { items: [...items], net: net, gross: gross, vat: vat };
};
