import { NxAction } from "src/app/nx/nx.actions"
import { Expense } from "./expense.model"
import { ModalBaseService } from "@app/_modals/modal-base-service"
import { ModalEditExpenseComponent } from "src/app/_modals/modal-edit-expense/modal-edit-expense.component"
import { NxGlobal } from "src/app/nx/nx.global"

export function getExpenseActions(self: Expense): NxAction[] {
    return [
        { title: $localize`:@@i18n.common.edit:edit`, action: () => ModalBaseService.open(ModalEditExpenseComponent, self) },
        NxGlobal.deleteAction(self, $localize`:@@i18n.common.reallyDeleteThisExpense:really delete this expense?`, { roles: 'admin' }),
    ]
}
