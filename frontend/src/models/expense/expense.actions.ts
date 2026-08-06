import { NxAction } from '@models/_core/nx.actions';
import { Expense } from './expense.model';
import { MODAL } from '@models/_core/modal-registry';
import { nx } from '@models/_core/nx-bridge';

export function getExpenseActions(self: Expense): NxAction[] {
    return [
        { title: $localize`:@@i18n.common.edit:edit`, doubleClick: true, action: () => nx().openModal(MODAL.editExpense, self) },
        {
            title: 'change matching string',
            action: () => {
                const val = window.prompt('matching string', self.matching_string ?? '');
                if (val === null) return;
                self.matching_string = val;
                self.update().subscribe();
            },
        },
        {
            title: 'clear matching string',
            on: () => !!self.matching_string,
            action: () => {
                self.matching_string = '';
                self.update().subscribe();
            },
        },
        nx().deleteAction(self, $localize`:@@i18n.common.reallyDeleteThisExpense:really delete this expense?`, { roles: 'admin' }),
    ];
}
