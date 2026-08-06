import { renderComponent } from '@testing/component-test';
import { Expense } from '@models/expense/expense.model';
import { ModalEditExpenseComponent } from '@app/_modals/modal-edit-expense/modal-edit-expense.component';

describe('edit modals render', () => {
    it('ModalEditExpenseComponent', () => {
        const expense = Expense.fromJson({ id: '1', name: 'hosting', price: 12 });
        const fixture = renderComponent(ModalEditExpenseComponent, {
            tables: { expenses: ['name', 'price', 'repeat', 'category_id', 'starts_at', 'matching_string'] },
            setup: (modal) => modal.init(expense),
        });

        expect(fixture.nativeElement.textContent).toContain('hosting');
    });
});
