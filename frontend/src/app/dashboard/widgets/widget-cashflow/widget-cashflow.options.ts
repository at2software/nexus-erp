export const EXPENSE_KEY = 'CASHFLOW_ANNUAL_EXPENSES';

export const CASHFLOW_CHART_TOTAL: any[] = [
    [$localize`:@@i18n.dynamic.CASHFLOW_BANK_BALANCE:Bank Balance`, 'yellow', 'CASHFLOW_BANK_BALANCE', 'account_balance'],
    [$localize`:@@i18n.dynamic.CASHFLOW_INVOICES_REPAYMENTS:Repayments`, 'green', 'CASHFLOW_INVOICES_REPAYMENTS', 'payments'],
    [$localize`:@@i18n.dynamic.CASHFLOW_INVOICES_REPAYMENTS_OVERDUE:Overdue Repayments`, 'green', 'CASHFLOW_INVOICES_REPAYMENTS_OVERDUE', 'error_outline'],
    [$localize`:@@i18n.dynamic.CASHFLOW_INVOICES_RECURRING:Recurring invoices`, 'green', 'CASHFLOW_INVOICES_RECURRING', 'repeat'],
    [$localize`:@@i18n.common.invoices:invoices`, 'green', 'CASHFLOW_INVOICES', 'receipt'],
    [$localize`:@@i18n.common.preparedInvoices:prepared invoices`, 'teal', 'CASHFLOW_INVOICES_PREPARED', 'description'],
    [$localize`:@@i18n.common.timeBasedProjects:time based projects`, 'cyan', 'CASHFLOW_PROJECTS_TIMEBASED', 'schedule'],
    [$localize`:@@i18n.common.projects:projects`, 'cyan', 'CASHFLOW_PROJECTS', 'work'],
    [$localize`:@@i18n.common.customerSupport:customer support`, 'cyan', 'CASHFLOW_CUSTOMER_SUPPORT', 'support_agent'],
    //[$localize`:@@i18n.dynamic.CASHFLOW_COMPANIES_TIMEBASED:time based customer support`, 'cyan', 'CASHFLOW_COMPANIES_TIMEBASED', 'schedule'],
    [$localize`:@@i18n.common.acquisitions:acquisitions`, 'indigo', 'CASHFLOW_PROJECTS_ACQUISITIONS', 'trending_up'],
    [$localize`:@@i18n.dynamic.CASHFLOW_PROJECTS_LINREG:Time based regression`, 'purple', 'CASHFLOW_PROJECTS_LINREG', 'show_chart'],
    [$localize`:@@i18n.dynamic.CASHFLOW_ANNUAL_EXPENSES:annual Expenses`, 'red', 'CASHFLOW_ANNUAL_EXPENSES', 'money_off'],
];
const OTHER_CHARTS: any[] = [
    [$localize`:@@i18n.common.revenue:revenue`, 'INVOICE_REVENUE_12M'],
    [$localize`:@@i18n.invoice.degressiveRevenue:degressive revenue`, 'INVOICE_DEG_12M'],
    [$localize`:@@i18n.project.leadSuccess:lead success`, 'PROJECT_SUCCESS_RATE'],
];
export const CASHFLOW_I18N_SIMPLE = CASHFLOW_CHART_TOTAL.map((_) => _[2]);
export const CASHFLOW_CHART_CHARTS: Record<string, string> = Object.fromEntries(CASHFLOW_CHART_TOTAL.map((_) => [_[2], _[1]]));
export const CASHFLOW_CHART_I18N: Record<string, string> = Object.fromEntries(CASHFLOW_CHART_TOTAL.map((_) => [_[2], _[0]]));
export const CASHFLOW_CHART_ICONS: Record<string, string> = Object.fromEntries(CASHFLOW_CHART_TOTAL.map((_) => [_[2], _[3]]));
export const CASHFLOW_CHART_KEYS = CASHFLOW_I18N_SIMPLE;
export const CASHFLOW_I18N = (key: string) => {
    const a = CASHFLOW_CHART_TOTAL.find((_) => _[2] == key);
    if (a) return a[0];
    const b = OTHER_CHARTS.find((_) => _[1] == key);
    if (b) return b[0];
    return '';
};
