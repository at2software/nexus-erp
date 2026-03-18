import { Injectable } from '@angular/core';
import { NexusHttpService } from '../http/http.nexus';
import { Expense } from './expense.model';
import { ExpenseCategory } from './expense-category.model';

@Injectable({ providedIn: 'root'})
export class ExpenseService extends NexusHttpService<Expense> {
  public apiPath = 'expenses'
  public TYPE = () => Expense
  indexCategories = () => this.aget('expenses/categories', {}, ExpenseCategory)
}