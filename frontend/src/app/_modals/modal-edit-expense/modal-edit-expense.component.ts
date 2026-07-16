import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Expense } from '@models/expense/expense.model';
import { GlobalService } from '@models/global.service';
import { ExpenseService } from '@models/expense/expense.service';
import { ExpenseCategory } from '@models/expense/expense-category.model';
import { ModalEditComponent } from '@app/_modals/modal-edit.component';

import { FormsModule } from '@angular/forms';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'modal-edit-expense',
    templateUrl: './modal-edit-expense.component.html',
    imports: [FormsModule, HotkeyDirective],
})
export class ModalEditExpenseComponent extends ModalEditComponent<Expense> {
    categories = signal<ExpenseCategory[]>([]);

    global = inject(GlobalService);
    expenseService = inject(ExpenseService);

    new = () => Expense;
    keys = () => ['name', 'price', 'repeat', 'category_id', 'starts_at', 'matching_string'];

    constructor() {
        super();
        this.expenseService.indexCategories().subscribe((data) => this.categories.set(data));
    }
}
