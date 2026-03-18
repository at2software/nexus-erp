export enum InvoiceItemType {
    Default            = 0,
    Inactive           = 1,
    Optional           = 2,
    Paydown            = 10,
    Discount           = 11,
    Instalment         = 12,
    Header             = 20,
    Daily              = 30,
    Weekly             = 31,
    Monthly            = 32,
    Quarterly          = 33,
    Yearly             = 34,
    PreparedInstalment = 40,
    PreparedSupport    = 41,
    PreparedRepeating  = 43,
}

export function getInvoiceItemTypeRepeatColor(type: InvoiceItemType): string {
    switch (type) {
        case InvoiceItemType.Daily: return 'text-pink';
        case InvoiceItemType.Weekly: return 'text-purple';
        case InvoiceItemType.Monthly: return 'text-indigo';
        case InvoiceItemType.Quarterly: return 'text-blue';
        case InvoiceItemType.Yearly: return 'text-cyan';
    }
    return 'text-lighter'
}
export type InvoiceItemTypeRepeating = InvoiceItemType.Daily | InvoiceItemType.Monthly | InvoiceItemType.Weekly | InvoiceItemType.Quarterly | InvoiceItemType.Yearly
export const REPEATING_TYPES = [InvoiceItemType.Daily, InvoiceItemType.Weekly, InvoiceItemType.Monthly, InvoiceItemType.Quarterly, InvoiceItemType.Yearly] as const