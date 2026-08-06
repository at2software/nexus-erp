import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Expense } from '@models/expense/expense.model';
import { GlobalService } from '@models/global.service';
import { ExpenseService } from '@models/expense/expense.service';
import { ModalEditComponent } from '@app/_modals/modal-edit.component';
import { modelListResource } from '@models/http/model-resource';

import { FormsModule } from '@angular/forms';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'modal-edit-expense',
    templateUrl: './modal-edit-expense.component.html',
    imports: [FormsModule, HotkeyDirective],
})
export class ModalEditExpenseComponent extends ModalEditComponent<Expense> {
    global = inject(GlobalService);
    expenseService = inject(ExpenseService);

    readonly #categories = modelListResource(() => this.expenseService.indexCategories());
    categories = this.#categories.value;

    new = () => Expense;
    keys = () => ['name', 'price', 'repeat', 'category_id', 'starts_at', 'matching_string'];
}
