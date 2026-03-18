import { Component, inject, OnInit } from '@angular/core';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { ExpenseCategory } from 'src/models/expense/expense-category.model';
import { Expense } from 'src/models/expense/expense.model';
import { ExpenseService } from 'src/models/expense/expense.service';
import { GlobalService } from 'src/models/global.service';
import { ModalEditExpenseComponent } from '@app/_modals/modal-edit-expense/modal-edit-expense.component';
import { Toast } from 'src/app/_shards/toast/toast';
import { InvoiceItemType } from 'src/enums/invoice-item.type';
import { forkJoin, Observable } from 'rxjs';
import { NexusModule } from '@app/nx/nexus.module';
import { MoneyPipe } from 'src/pipes/money.pipe';
import { DndDirective } from '@directives/dnd.directive';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

@Component({
    selector: 'invoice-expenses',
    templateUrl: './invoice-expenses.component.html',
    styleUrls: ['./invoice-expenses.component.scss'],
    standalone: true,
    imports: [NexusModule, MoneyPipe, DndDirective, EmptyStateComponent]
})
export class InvoiceExpensesComponent implements OnInit {
    isLoaded: boolean = false
    expenses: Expense[] = []
    categories: ExpenseCategory[] = []

    expenseService = inject(ExpenseService)
    global = inject(GlobalService)
    expenseModal = inject(ModalBaseService)

    sum = 0
    selectionSum = 0
    selectionExpenses: Expense[] = []

    lopsHeaders?:string[]
    lopsItems?:string[][]
    lopsNameColumn:number = 1
    lopsCostColumn:number = 8

    ngOnInit() {
        this.expenseService.indexCategories().subscribe(cat => {
            cat.forEach(_ => _.var.visible = true)
            this.categories = cat
            this.reload()
        })
        this.global.onSelectionIn(() => this.expenses, 'yearlyPrice').subscribe(_ => {
            [this.selectionExpenses, this.selectionSum] = _
        })
    }
    reload() {
        this.expenseService.index().subscribe(data => {
            this.isLoaded = true
            this.sum = data.reduce((a, b) => a + b.yearlyPrice, 0)
            this.expenses = data
        })
    }

    onNewExpense = () => this.expenseModal.open(ModalEditExpenseComponent, undefined)

    categoryFor = (_: Expense): ExpenseCategory | undefined => this.categories.find(x => x.id == _.category_id)
    sumFor = (_: ExpenseCategory): number => this.expenses.filter(x => x.category_id == _.id).reduce((a, x) => a + x.yearlyPrice, 0)
    toggleCategoryVisibility = (_: ExpenseCategory) => {
        _.var.visible = !_.var.visible
        this.sum = this.categories.filter(_ => _.var.visible).map(_ => this.sumFor(_)).reduce((a,b) => a + b, 0)
    }

    getLopsNames = () => this.lopsItems?.map(_ => _[this.lopsNameColumn].trim().toLowerCase()) ?? []
    getItems = () => {
        const conv = (s:string) => parseFloat(s.replace('.', '').replace(',', '.'))
        if (this.lopsHeaders) {
            const names = this.getLopsNames()
            const m = this.expenses.filter(_ => names.findIndex(x => x === _.name.trim().toLowerCase()) !== -1)
            let lopsCategory:string|undefined = undefined
            m.forEach(_ => {
                const index = names.findIndex(x => x === _.name.trim().toLowerCase())
                _.var.lops = conv(this.lopsItems![index][this.lopsCostColumn])
                lopsCategory = _.category_id
            })
            names.forEach((_, i:number) => {
                const index = m.findIndex(x => x.name.trim().toLowerCase() === _)
                if (index === -1) {
                    const node = Expense.fromJson({
                        'name'           : this.lopsItems![i][this.lopsNameColumn],
                        'price'          : -1,
                        'repeat'         : InvoiceItemType.Monthly,
                        'category_id'    : this.categories[0].id,
                        'invoice_item_id': null
                    })
                    node.var.lops = conv(this.lopsItems![i][this.lopsCostColumn])
                    m.push(node)
                }
            })
            // find deprecated cost
            if (lopsCategory) {
                const deprecated = this.expenses.filter(_ => _.category_id == lopsCategory && names.findIndex(x => x === _.name.trim().toLowerCase()) === -1)
                deprecated.forEach(_ => {
                    _.var.lops = -1
                    m.push(_)
                })
            }
            return m
        } else {
            return this.expenses
        }
    }

    onDnd(files: File[]) {
        const reader = new FileReader();
        reader.onload = (event:any) => {

            this.categories.forEach(_ => _.var.visible = true)

            const text = event.target.result

            // find first row with more than one semicolon
            const lines = text.split(/\r?\n|\r|\n/g)
            while (lines.length && (lines[0].match(/;/g) || []).length < 2) {
                lines.shift()
            }
            if (lines.length === 0) {
                Toast.warn('invalid CSV file')
                return
            }

            // next line is the header row
            this.lopsHeaders = lines.shift().split(/;/)

            // parse items
            const n:string[][] = []
            let realItem = true
            while (lines.length && realItem) {
                const o = lines.shift().split(/;/)
                if (o.length !== this.lopsHeaders!.length) {
                    realItem = false
                }
                if (o[this.lopsNameColumn].trim().length === 0) {
                    realItem = false
                }
                if (realItem) {
                    n.push(o)
                }
            }
            this.lopsItems = n
        };
        reader.readAsText(files[0], 'ansi_x3.4-1968');
    }
    onLopsUpdate() {
        const items = this.getItems()
        const observavbles:Observable<any>[] = []
        items.forEach(item => {
            if (item.price === -1) {
                item.price = item.var.lops
                observavbles.push(item.store())
            } else {
                if (item.var.lops === -1) {
                    observavbles.push(item.delete())
                } else {
                    observavbles.push(item.update({ price: item.var.lops }))
                }
            }
        })
        forkJoin(observavbles).subscribe(() => {
            this.lopsHeaders = undefined
            this.lopsItems = undefined
            this.reload()
        })
    }
}
