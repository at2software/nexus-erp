import { NxAction, NxActionType } from "src/app/nx/nx.actions"
import { Invoice } from "./invoice.model"
import { NxGlobal } from "src/app/nx/nx.global"

export function getInvoiceActions(self: Invoice): NxAction[] {
    const navigateAfterInvoiceAction = (projectId?: string) => {
        if (projectId) {
            self.navigate('projects/' + projectId + '/invoicing')
            return
        }
        self.navigate('customers/' + self.company.id + '/billing')
    }

    return [
        { title: $localize`:@@i18n.common.open:open`, action: () => self.navigate(self.frontendUrl()) },
        { title: $localize`:@@i18n.invoice.sendMail:send mail`, action: () => self.sendMail(), on: () => !self.paid_at },
        { title: $localize`:@@i18n.invoice.sendReminder:send reminder`, action: () => self.sendReminder(), on: () => self.needs_reminder },
        { title: $localize`:@@i18n.invoice.markPaid:mark paid`, group: true, on: () => !self.paid_at, action: () => self.setPaid() },
        { title: $localize`:@@i18n.invoice.markUnpaid:mark unpaid`, group: true, on: () => (self.paid_at ? true : false), action: () => self.setUnpaid() },
        // {
        //     title: $localize`:@@i18n.invoice.selectAll:select all...`, children: [
        //         { title: $localize`:@@i18n.common.ofCustomer:...of customer`, hotkey: 'CTRL+ALT+C', action: () => self.nxSelect((_: Invoice) => _.company_id == self.company_id) }
        //     ]
        // },
        {
            title: $localize`:@@i18n.invoice.cancel:cancel`, action: () => {
                self.confirm($localize`:@@i18n.invoice.confirmCancel:Are you sure you want to cancel this invoice? This will create a cancellation invoice.`).then(() => self.cancel().subscribe(() => {
                    const projectItem = self.invoice_items?.find((item: any) => item.project_id)
                    navigateAfterInvoiceAction(projectItem?.project_id)
                }))
            }
        },
        {
            title: $localize`:@@i18n.invoice.undo:undo`,
            on: () => self.isLatestInvoice(), 
            type: NxActionType.Destructive,
            action: () => {
                self.confirm($localize`:@@i18n.invoice.confirmUndo:Are you sure you want to undo this invoice?`).then(() => self.undo().subscribe((response: any) => {
                    NxGlobal.global.settings['INVOICE_NO_CURRENT'] = response.INVOICE_NO_CURRENT
                    navigateAfterInvoiceAction(response?.item?.project_id)
                }))
            }
        },
        ...self.markerActions(),
        { title: $localize`:@@i18n.invoice.sendToDatev:send to DATEV`, context: 'invoice.module.table', on: () => NxGlobal.global.setting('DATEV_MAIL_OUTGOING'), group: true, action: () => self.sendToDatev() },
        //{ title: $localize`:@@i18n.invoice.updateValues:update values`, group: true, action:()=>this.updateValues().subscribe() },
    ]
}
