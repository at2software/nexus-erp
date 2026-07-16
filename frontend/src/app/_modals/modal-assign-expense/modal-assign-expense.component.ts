import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { Expense } from '@models/expense/expense.model';

@Component({
    selector: 'modal-assign-expense',
    templateUrl: './modal-assign-expense.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [FormsModule],
})
export class ModalAssignExpenseComponent extends ModalBaseComponent<Expense> {
    expenses = signal<Expense[]>([]);
    pattern = signal('');
    filter = signal('');
    #selected: Expense | null = null;

    init(expenses: Expense[], pattern: string) {
        this.expenses.set(expenses);
        this.pattern.set(pattern);
    }

    onSuccess() { return this.#selected!; }

    readonly filtered = computed<Expense[]>(() => {
        const q = this.filter().toLowerCase();
        return q ? this.expenses().filter((e) => e.name.toLowerCase().includes(q)) : this.expenses();
    });

    pick(exp: Expense) {
        this.#selected = exp;
        this.accept();
    }
}
