import { NexusHttpService } from '@models/http/http.nexus';
import { Serializable } from './../serializable';
import { Color } from '@constants/Color';
import { Model } from '@constants/type-discriminators';
import { computed } from '@angular/core';
import { NxGlobal } from '@app/nx/nx.global';
import { nxInput } from '@constants/constants';
import { NxAction } from '@app/nx/nx.actions';

@Model('ExpenseCategory')
export class ExpenseCategory extends Serializable {
    static API_PATH = (): string => 'expense-categories';
    static DB_TABLE_NAME = () => 'expense_categories';
    SERVICE = NexusHttpService<any>;

    name: string = '';
    color: string | null = null;

    actions: NxAction[] = [
        {
            title: 'change name',
            interrupt: nxInput('New name'),
            action: (_s:any, _ctx:any, interruptResult:{ text: string}) => this.update({ name: interruptResult.text })
        },
        NxGlobal.deleteAction(this, $localize`:@@i18n.common.reallyDeleteThisExpenseCategory:really delete this expense category?`, { roles: 'admin' }),
    ]

    css = computed(() => Color.posToHex(parseInt(this.snapshot().id)));
}
