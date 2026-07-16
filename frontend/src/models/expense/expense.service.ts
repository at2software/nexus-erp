import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { NexusHttpService } from '../http/http.nexus';
import { Expense } from './expense.model';
import { ExpenseCategory } from './expense-category.model';
import { environment } from 'src/environments/environment';
import { BankTransactionsResponse } from '@models/api-response';

@Injectable({ providedIn: 'root' })
export class ExpenseService extends NexusHttpService<Expense> {
    public apiPath = 'expenses';
    override readonly model = Expense;

    #http = inject(HttpClient);

    indexCategories = () => this.aget('expenses/categories', {}, ExpenseCategory);
    bankDebitTransactions = () => this.#http.get<BankTransactionsResponse>(`${environment.envApi}expenses/bank-transactions`);
}
