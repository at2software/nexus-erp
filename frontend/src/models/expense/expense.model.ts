import { Serializable } from '@models/_core/serializable';
import { getInvoiceItemTypeRepeatColor, InvoiceItemType, InvoiceItemTypeRepeating } from '@enums/invoice-item.type';
import { NxAction, NxActionType } from '@models/_core/nx.actions';
import { getExpenseActions } from './expense.actions';
import { Model } from '@constants/model/type-discriminators';
import { tap } from 'rxjs';
import { Dictionary } from '@constants/constants';

export const REPEATING_MULT = { 30: 365, 31: 52, 32: 12, 33: 4, 34: 1 };
@Model('Expense')
export class Expense extends Serializable {
    static API_PATH = (): string => 'expenses';

    invoice_item_id: string = '';
    category_id: string = '';
    name: string = '';
    starts_at: string = '';
    ends_at: string = '';
    matching_string: string = '';
    price: number = 0;
    key: string = '';
    value: number = 0;

    repeat: InvoiceItemTypeRepeating = InvoiceItemType.Monthly;

    protected override buildActions(): NxAction[] { return getExpenseActions(this) }
    
    get yearlyPrice(): number {
        return this.repeat in REPEATING_MULT ? REPEATING_MULT[this.repeat] * this.price : 0;
    }

    getAllRepeatKeys = () => Object.keys(REPEATING_MULT).map((_) => parseInt(_));
    repeatString = () => this.repeatStringFor(this.repeat);
    repeatColor = () => this.repeatColorFor(this.repeat);
    repeatStringFor = (_: InvoiceItemType | number) => InvoiceItemType[_];
    repeatColorFor = (_: InvoiceItemType | number) => getInvoiceItemTypeRepeatColor(_);

    daysUntilNext(): number | null {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const anchor = this.starts_at ? new Date(this.starts_at) : new Date(today);
        anchor.setHours(0, 0, 0, 0);
        const next = new Date(anchor);
        while (next < today) {
            switch (this.repeat) {
                case 30: next.setDate(next.getDate() + 1); break;
                case 31: next.setDate(next.getDate() + 7); break;
                case 32: next.setMonth(next.getMonth() + 1); break;
                case 33: next.setMonth(next.getMonth() + 3); break;
                case 34: next.setFullYear(next.getFullYear() + 1); break;
                default: return null;
            }
        }
        return Math.round((next.getTime() - today.getTime()) / 86400000);
    }
    addCategoryChangeAction = (categories: Dictionary<string>, index: number) => {
        this.actions.splice(index, 0, {
            title: $localize`:@@i18n.common.changeCategory:change category`,
            group: true,
            type: NxActionType.Update,
            children: Object.entries(categories).map(([id, name]) => ({
                title: name,
                group: true,
                type: NxActionType.Update,
                action: () => this.update({ category_id: id }).pipe(tap(() => this.category_id = id)),
            })),
        });
    };
}
