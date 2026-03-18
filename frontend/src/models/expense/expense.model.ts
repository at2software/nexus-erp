import { Serializable } from "./../serializable"
import { getInvoiceItemTypeRepeatColor, InvoiceItemType, InvoiceItemTypeRepeating } from "src/enums/invoice-item.type"
import { NxAction } from "src/app/nx/nx.actions"
import { ExpenseService } from "./expense.service"
import { getExpenseActions } from "./expense.actions"

export const REPEATING_MULT = { 30: 365, 31: 52, 32: 12, 33:4, 34:1 }
export class Expense extends Serializable {

    static API_PATH = (): string => 'expenses'
    SERVICE = ExpenseService

    invoice_item_id :string = ''
    category_id     :string = ''
    name            :string = ''
    starts_at       :string = ''
    ends_at         :string = ''
    price           :number = 0

    repeat          :InvoiceItemTypeRepeating = InvoiceItemType.Monthly

    doubleClickAction: number = 0
    actions:NxAction[] = getExpenseActions(this)

    getAllRepeatKeys = () => Object.keys(REPEATING_MULT).map(_ => parseInt(_))
    repeatString = () => this.repeatStringFor(this.repeat)
    repeatColor = () => this.repeatColorFor(this.repeat)
    repeatStringFor = (_:InvoiceItemType|number) => InvoiceItemType[_]
    repeatColorFor = (_:InvoiceItemType|number) => getInvoiceItemTypeRepeatColor(_)
    get yearlyPrice ():number { return this.repeat in REPEATING_MULT ? REPEATING_MULT[this.repeat] * this.price : 0 }
}