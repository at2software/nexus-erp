import { NxAction } from '@app/nx/nx.actions';
import { Expense } from './expense.model';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { ModalEditExpenseComponent } from '@app/_modals/modal-edit-expense/modal-edit-expense.component';
import { NxGlobal } from '@app/nx/nx.global';

export function getExpenseActions(self: Expense): NxAction[] {
    return [
        { title: $localize`:@@i18n.common.edit:edit`, action: () => ModalBaseService.open(ModalEditExpenseComponent, self) },
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
        NxGlobal.deleteAction(self, $localize`:@@i18n.common.reallyDeleteThisExpense:really delete this expense?`, { roles: 'admin' }),
    ];
}
