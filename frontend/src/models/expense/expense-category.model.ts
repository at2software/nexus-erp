import { Serializable } from '@models/_core/serializable';
import { Color } from '@constants/Color';
import { Model } from '@constants/model/type-discriminators';
import { computed } from '@angular/core';
import { nx } from '@models/_core/nx-bridge';
import { MODAL } from '@models/_core/modal-registry';
import { NxAction } from '@models/_core/nx.actions';

@Model('ExpenseCategory')
export class ExpenseCategory extends Serializable {
    static API_PATH = (): string => 'expense-categories';
    static DB_TABLE_NAME = () => 'expense_categories';

    name: string = '';
    color: string | null = null;

    protected override buildActions(): NxAction[] {
        return [
            {
                title: 'change name',
                interrupt: { service: MODAL.input, args: { title: 'New name' } },
                action: (_s:any, _ctx:any, interruptResult:{ text: string}) => this.update({ name: interruptResult.text })
            },
            nx().deleteAction(this, $localize`:@@i18n.common.reallyDeleteThisExpenseCategory:really delete this expense category?`, { roles: 'admin' }),
        ];
    }

    css = computed(() => Color.posToHex(parseInt(this.snapshot().id)));
}
