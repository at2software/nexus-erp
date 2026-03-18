import { Component, inject, OnInit } from '@angular/core';
import { Expense } from '@models/expense/expense.model';
import { GlobalService } from '@models/global.service';
import { ExpenseService } from '@models/expense/expense.service';
import { ExpenseCategory } from '@models/expense/expense-category.model';
import { ModalEditComponent } from '@app/_modals/modal-edit.component';

import { FormsModule } from '@angular/forms';
import { HotkeyDirective } from '@directives/hotkey.directive';

@Component({
    selector: 'modal-edit-expense',
    templateUrl: './modal-edit-expense.component.html',
    styleUrls: ['./modal-edit-expense.component.scss'],
    standalone: true,
    imports: [FormsModule, HotkeyDirective]
})
export class ModalEditExpenseComponent extends ModalEditComponent<Expense> implements OnInit {
    
    categories:ExpenseCategory[] = []

    global = inject(GlobalService)
    expenseService = inject(ExpenseService)
    
    new = () => Expense
    keys = () => ['name', 'price', 'repeat', 'category_id']

    ngOnInit() {
        this.expenseService.indexCategories().subscribe(data => this.categories = data)
    }
}