import { chartTooltipHideEvent } from "@charts/apx-chart-x/chartTooltipHideEvent"
import { NxGlobal } from "src/app/nx/nx.global"
import { Color } from "src/constants/Color"
import { mergeArraysToMap } from "src/constants/mergeArraysToMap"

export const EXPENSE_KEY = 'CASHFLOW_ANNUAL_EXPENSES'

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
]
const OTHER_CHARTS:any[] = [
    [$localize`:@@i18n.common.revenue:revenue`, 'INVOICE_REVENUE_12M'],
    [$localize`:@@i18n.invoice.degressiveRevenue:degressive revenue`, 'INVOICE_DEG_12M'],
    [$localize`:@@i18n.project.leadSuccess:lead success`, 'PROJECT_SUCCESS_RATE'],
]
export const CASHFLOW_I18N_SIMPLE = CASHFLOW_CHART_TOTAL.map(_ => _[2])
export const CASHFLOW_CHART_CHARTS: Record<string, string> = mergeArraysToMap(CASHFLOW_I18N_SIMPLE, CASHFLOW_CHART_TOTAL.map(_ => _[1]))
export const CASHFLOW_CHART_I18N: Record<string, string> = mergeArraysToMap(CASHFLOW_I18N_SIMPLE, CASHFLOW_CHART_TOTAL.map(_ => _[0]))
export const CASHFLOW_CHART_ICONS: Record<string, string> = mergeArraysToMap(CASHFLOW_I18N_SIMPLE, CASHFLOW_CHART_TOTAL.map(_ => _[3]))
export const CASHFLOW_CHART_KEYS = CASHFLOW_I18N_SIMPLE
export const CASHFLOW_I18N = (key:string) => {
    const a = CASHFLOW_CHART_TOTAL.find(_ => _[2] == key)
    if (a) return a[0]
    const b = OTHER_CHARTS.find(_ => _[1] == key)
    if (b) return b[0]
    return ''
}

export const CASHFLOW_CHART_OPTIONS = (shortFunction: (val: number) => string, filteredCharts: () => string[]) => {
    const filteredKeys = filteredCharts()
    return {
        chart: { stacked: true, height: 100, type: 'area', events: chartTooltipHideEvent },
        series: [],
        yaxis: { min: 0, formatter: (val: number) => val.toFixed(2) + ' ' + NxGlobal.global.currencySymbol },
        xaxis: { type: 'datetime' },
        stroke: {
            curve: 'straight', width: 2,
            dashArray: filteredKeys.find(_ => _ == EXPENSE_KEY) ? [5, ...Array(filteredKeys.length - 1).fill(0)] : Array(filteredKeys.length - 1).fill(0),
            colors: filteredKeys.map(_ => Color.fromVar(CASHFLOW_CHART_CHARTS[_]).toHexString())
        },
        grid: { padding: { left: 0, right: 0 } },
        fill: {
            colors: filteredKeys.map(_ => Color.fromVar('--color-card', '').changeHsl({l: 5}).toHexString()),
            //colors: filteredKeys.map(_ => '#09f'),
            opacity: 1, type: 'solid'
        },
        tooltip: {
            shared: true, 
            intersect: false,
            followCursor: false,
            fixed: {
                enabled: true,
                position: 'top',
                offsetY: 90,
                offsetX: 30
            },
            custom: (_: any) => {
                const { series: _mySeries, dataPointIndex, w } = _
                const data = w.globals.initialSeries[1].data[dataPointIndex]
                let html = '<span class="f-b p-3 text-bold">' + data.x + '</span>'
                let sum = 0
                let table = ''
                for (const index in w.config.series) {
                    const s = w.config.series[index]
                    if (typeof (s) != 'object') continue
                    const color = w.config.stroke.colors[index]
                    if (dataPointIndex in s.data && s.data[dataPointIndex].y > 0) {
                        if (s.name == EXPENSE_KEY) continue
                        const name = s.name
                        const val = shortFunction(s.data[dataPointIndex].y)
                        sum += s.data[dataPointIndex].y
                        table = `<div class="hstack gap-2 font-monospace"><div class="flex-fill" style="color:${color};">${name}</div><div class="text-end text-monospace">${val}</div></div>` + table
                    }
                }
                html += table
                const ssum = shortFunction(sum)
                html += `<div class="hstack gap-2"><div class="flex-fill">&sum;</div><div class="text-end font-monospace">${ssum}</div></div>`
                return '<div class="arrow_box">' + html + '</div>'
            }
        }
    }
}