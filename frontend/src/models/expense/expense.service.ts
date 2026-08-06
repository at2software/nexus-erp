import { inject, Service } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NexusHttpService } from '../http/http.nexus';
import { Expense } from './expense.model';
import { ExpenseCategory } from './expense-category.model';
import { environment } from '@environments/environment';
import { BankTransactionsDto } from '@models/_core/api-response';

@Service()
export class ExpenseService extends NexusHttpService<Expense> {
    public apiPath = 'expenses';
    override readonly model = Expense;

    #http = inject(HttpClient);

    indexCategories = () => this.aget('expenses/categories', {}, ExpenseCategory);
    bankDebitTransactions = () => this.#http.get<BankTransactionsDto>(`${environment.envApi}expenses/bank-transactions`);
}
