import { NxAction, NxActionType } from "src/app/nx/nx.actions"
import { Expense } from "./expense.model"
import { ModalBaseService } from "@app/_modals/modal-base-service"
import { ModalEditExpenseComponent } from "src/app/_modals/modal-edit-expense/modal-edit-expense.component"
import { ModalConfirmComponent } from "@app/_modals/modal-confirm/modal-confirm.component"

export function getExpenseActions(self: Expense): NxAction[] {
    return [
        { title: $localize`:@@i18n.common.edit:edit`, action: () => ModalBaseService.open(ModalEditExpenseComponent, self) },
        {
            title: $localize`:@@i18n.common.delete:delete`,
            interrupt: { service: ModalConfirmComponent, args: { message: $localize`:@@i18n.common.reallyDeleteThisExpense:really delete this expense?`, title: $localize`:@@i18n.common.attention:attention` } },
            action: () => self.delete(),
            type: NxActionType.Destructive,
            group: true,
            hotkey: 'CTRL+DELETE',
            roles: 'admin'
        },
    ]
}
