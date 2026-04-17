
import { Component, inject, OnDestroy, ViewChild, OnInit } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { NexusModule } from '@app/nx/nexus.module';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { Assignee } from '@models/assignee/assignee.model';
import { AssignmentService } from '@models/assignee/assignment.service';
import { CompanyContact } from '@models/company/company-contact.model';
import { TBillingConsideration } from '@models/company/company.model';
import { GlobalService } from '@models/global.service';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { Project } from '@models/project/project.model';
import { ProjectService } from '@models/project/project.service';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { PdfCreationType } from '../../../../enums/PdfCreationType';
import { InvoiceItemType } from '../../../../enums/invoice-item.type';
import { InvoiceVatHandling } from '../../../../enums/invoice.vat-handling';
import { Invoice } from '@models/invoice/invoice.model';
import { InvoicePrepareWrapper } from '@app/invoices/_shards/invoice-prepare-wrapper/invoice-prepare-wrapper';
import { Subscription } from 'rxjs';
import { ToastService } from '@shards/toast/toast.service';
import { StatsService } from '@models/stats-service';
import { ProbabilityCurvePoint } from './project-invoicing-gauge.component';
import moment from 'moment';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { ModalEditInvoiceItemComponent } from '@app/_modals/modal-edit-invoice-item/modal-edit-invoice-item.component';
import { ModalInvoiceDiscountComponent } from '@app/_modals/modal-invoice-discount/modal-invoice-discount.component';
import { ModalInvoiceAddInstalmentComponent } from '@app/_modals/modal-invoice-add-instalment/modal-invoice-add-instalment.component';
import { SafePipe } from 'src/pipes/safe.pipe';
import { MoneyPipe } from 'src/pipes/money.pipe';
import { forkJoin } from 'rxjs';
import { ProjectInvoicingGaugeComponent } from './project-invoicing-gauge.component';

export enum TInvoicing { Quote, PartialInvoice, SupportInvoice, FinalInvoice }

@Component({
    selector: 'project-detail-quote',
    standalone: true,
    imports: [FormsModule, DatePipe, DecimalPipe, ToolbarComponent, InvoicePrepareWrapper, NexusModule, NgbTooltipModule, NgbDropdownModule, SafePipe, MoneyPipe, ProjectInvoicingGaugeComponent],
    templateUrl: './project-invoicing.component.html',
    styleUrl: './project-invoicing.component.scss'
})
export class ProjectInvoicingComponent implements OnDestroy, OnInit {

    personalized?: CompanyContact
    invoiceNumber: string
    invoicingType: number
    quoteDescriptions: string[] = []
    invoicedUntil?: string = undefined
    isCreatingInvoice = false
    currentBillingConsiderations: TBillingConsideration[] = []
    budgetCurve: ProbabilityCurvePoint[] = []
    timeMult: number = 1
    #subscription?: Subscription
    #routeSubscription?: Subscription

    project: Project
    #projectService     = inject(ProjectService)
    #assignmentService  = inject(AssignmentService)
    #global             = inject(GlobalService)
    #router             = inject(Router)
    #toastService       = inject(ToastService)
    #statsService       = inject(StatsService)
    parent              = inject(ProjectDetailGuard)
    #inputModalService  = inject(InputModalService)
    #route              = inject(ActivatedRoute)

    get global() { return this.#global; }

    @ViewChild(InvoicePrepareWrapper) invoicingContent: InvoicePrepareWrapper

    #timeCurve: ProbabilityCurvePoint[] = []

    ngOnInit() {
        this.#routeSubscription = this.#route.url.subscribe((segments) => {
            const mode = segments[0]?.path
            this.invoicingType = this.#typeFromRoute(mode)
        })

        this.invoiceNumber = Invoice.formattedInvoiceNumber()

        forkJoin([
            this.#statsService.projectSuccessProbabilityCurveValue(),
            this.#statsService.projectSuccessProbabilityCurve(),
        ]).subscribe(([budgetCurve, timeCurve]: [ProbabilityCurvePoint[], ProbabilityCurvePoint[]]) => {
            this.budgetCurve = budgetCurve
            this.#timeCurve  = timeCurve
            this.#updateTimeMult()
        })

        this.#subscription = this.parent.onChange.subscribe(() => {
            this.project = this.parent.current
            this.#updateTimeMult()

            this.personalized = this.project.assignees.filter(a => a.company_contact_id).map(a => Assignee.fromJson(a)).first()?.assignee as CompanyContact

            this.quoteDescriptions = []
            this.#projectService.indexQuoteDescriptions(this.project).subscribe(d => {
                this.quoteDescriptions = d.map(s => s.toString())
            })
            this.invoicedUntil = ''
        })
    }

    #updateTimeMult() {
        if (!this.#timeCurve.length || !this.project?.started_at) return
        const maxY   = Math.max(...this.#timeCurve.map(p => p.y))
        if (maxY === 0) return
        const days   = moment().diff(moment(this.project.started_at), 'days')
        const timeY  = this.#findYBelowThreshold(this.#timeCurve, days) ?? this.#timeCurve[0].y
        this.timeMult = timeY / maxY
    }

    #findYBelowThreshold(curve: ProbabilityCurvePoint[], threshold: number): number | null {
        let lo = 0, hi = curve.length - 1, result: number | null = null
        while (lo <= hi) {
            const mid = (lo + hi) >> 1
            if (curve[mid].x < threshold) { result = curve[mid].y; lo = mid + 1 }
            else hi = mid - 1
        }
        return result
    }

    ngOnDestroy() {
        this.#subscription?.unsubscribe()
        this.#routeSubscription?.unsubscribe()
    }

    #typeFromRoute(mode?: string): TInvoicing {
        switch (mode) {
            case 'downpayment': return TInvoicing.PartialInvoice
            case 'support': return TInvoicing.SupportInvoice
            case 'final': return TInvoicing.FinalInvoice
            case 'quote':
            default: return TInvoicing.Quote
        }
    }

    #routeFromType(type: TInvoicing): string {
        switch (type) {
            case TInvoicing.PartialInvoice: return 'downpayment'
            case TInvoicing.SupportInvoice: return 'support'
            case TInvoicing.FinalInvoice: return 'final'
            case TInvoicing.Quote:
            default: return 'quote'
        }
    }

    get backendConsiderations(): TBillingConsideration[] {
        return this.project?.company?.billing_considerations || []
    }

    get hasBillingConcerns(): boolean {
        return this.currentBillingConsiderations.length > 0
    }

    get billingConcernsTooltip(): string {
        if (!this.hasBillingConcerns) return ''
        const errors = this.currentBillingConsiderations.filter(c => c.type === 'error').length
        const warnings = this.currentBillingConsiderations.filter(c => c.type === 'warning').length
        const parts = []
        if (errors > 0) parts.push($localize`:@@i18n.invoice.billingErrors:${errors} error(s)`)
        if (warnings > 0) parts.push($localize`:@@i18n.invoice.billingWarnings:${warnings} warning(s)`)
        return parts.join(', ')
    }

    onConsiderationsChanged = (considerations: TBillingConsideration[]) => {
        setTimeout(() => this.currentBillingConsiderations = considerations)
    }

    get hasDownpaymentItems()  { return this.project?.invoice_items.some((x: InvoiceItem) => x.stage === 2 && !x.invoice_id) ?? false }
    get finalItems()           { return this.project?.invoice_items.filter((x: InvoiceItem) => x.stage === 0 && !x.invoice_id) ?? [] }

    get invoicedDownpayments(): number { return this.project?.invoiced_downpayments ?? 0 }
    get pendingDownpayments(): number {
        return this.project?.invoice_items
            ?.filter((x: InvoiceItem) => x.stage === 2 && !x.invoice_id)
            ?.reduce((sum: number, x: InvoiceItem) => sum + (x.net || 0), 0) ?? 0
    }
    get downpaymentRemaining(): number { return (this.project?.net ?? 0) - this.invoicedDownpayments - this.pendingDownpayments }

    get invoicedTotal(): number {
        return Math.max(0, (this.project?.net ?? 0) - (this.project?.net_remaining ?? 0))
    }
    get invoicingProgress(): number {
        const net = this.project?.net ?? 0
        return net > 0 ? Math.min(1, this.invoicedTotal / net) : 0
    }

    navigateToSupport(event: Event) {
        event.stopPropagation()
        if (this.project?.id) {
            this.#router.navigate(['/projects', this.project.id, 'support'])
        }
    }

    prepareInvoice() {
        this.#projectService.moveRegularItemsToCustomer(this.project).subscribe(_ => {
            this.#router.navigate(['/customers/' + this.project.company_id + '/billing'])
        })
    }
    makeInvoice = () => {
        this.isCreatingInvoice = true
        this.invoicingContent?.table()?.clear()
        const callback = () => {
            this.isCreatingInvoice = false
            this.#global.reloadInvoiceNumber().subscribe(() => {
                this.#gotoCompanyInvoices()
            })
        }
        switch (this.invoicingType) {
            case 0:
                this.#projectService.makePdf(this.project, PdfCreationType.Create)
                setTimeout(() => this.isCreatingInvoice = false, 500)
                break
            case 1: return this.#projectService.makeInvoice(this.project, this.invoicingType, callback)
            case 2: return this.#projectService.makeInvoice(this.project, this.invoicingType, callback)
            case 3: return this.#projectService.makeInvoice(this.project, this.invoicingType, callback)
        }
    }
    #gotoCompanyInvoices = () => this.#router.navigate(['customers/' + this.project.company.id + '/invoices'])

    onAddCompanyContact(x: CompanyContact) {
        const assignment = this.project.assignees.find((a: Assignee) => a.assignee === x);
        if (assignment) {
            this.#assignmentService.setMainContact(this.parent.current, assignment.id).subscribe(() => {
                this.parent.reload();
            });
        } else {
            this.#assignmentService.addToProject(this.parent.current, { id: x.id, class: 'company_contact' }).subscribe((newAssignment: Assignee) => {
                this.#assignmentService.setMainContact(this.parent.current, newAssignment.id).subscribe(() => {
                    this.parent.reload();
                });
            });
        }
    }

    getAssignedContacts = (): CompanyContact[] => {
        if (!this.project?.company?.employees) return [];
        return this.project.company.employees.filter(e => !e.is_retired);
    }

    warningMissingContact = () => this.parent.current?.personalized?.firstName ? false : true
    adresseeName = () => {
        const u = this.parent.current?.personalized;
        return (u && u.firstName) ? `${u.salutation || ''} ${u.firstName} ${u.familyName || ''}`.trim() : $localize`:@@i18n.project.selectCompanyContact:select company contact`
    }

    onChangePO() {
        this.#inputModalService.open($localize`:@@i18n.project.purchaseOrderNumber:PO#`, false, undefined, this.project.po_number)
            .then((result) => {
                if (result?.text !== undefined) {
                    this.project.update({ po_number: result.text }).subscribe(() => this.parent.reload())
                }
            })
    }

    onChangePaymentDuration = () => {
        const currentValue = this.project.getParam('INVOICE_PAYMENT_DURATION') || this.project.company.getParam('INVOICE_PAYMENT_DURATION') || '14'
        this.#inputModalService.open($localize`:@@i18n.projects.setPaymentDuration:Set payment duration in days`, false, undefined, currentValue)
            .then((result) => {
                if (result?.text) {
                    this.project.updateParam('INVOICE_PAYMENT_DURATION', { value: result.text })
                        .subscribe(() => {
                            this.#toastService.show($localize`:@@i18n.projects.paymentDurationUpdated:Payment duration updated`, { classname: 'bg-success text-light' })
                            this.parent.reload()
                        })
                }
            })
    }

    removePaymentDuration = () => {
        this.project.removeParam('INVOICE_PAYMENT_DURATION').subscribe(() => {
            this.#toastService.show($localize`:@@i18n.projects.paymentDurationRemoved:Payment duration removed`, { classname: 'bg-success text-light' })
            this.parent.reload()
        })
    }

    onInvoicingTypeChange(newType: number) {
        const type = newType as TInvoicing
        this.invoicingType = type
        if (this.project?.id) {
            this.#router.navigate(['/projects', this.project.id, 'invoicing', this.#routeFromType(type)])
        }
    }

    #storeProjectItem(item: InvoiceItem, stage: number, switchToQuote = false) {
        item.stage = stage
        item.project_id = this.project.id
        const payload = item.getPrimitives(['my_prediction'])
        payload.stage = stage
        payload.project_id = this.project.id
        payload.invoice_id = null
        payload.position = this.#getNextPositionForStage(stage)

        item.store(payload).subscribe(() => {
            if (switchToQuote) {
                this.onInvoicingTypeChange(TInvoicing.Quote)
            }
            this.parent.reload()
        })
    }

    #getNextPositionForStage(stage: number): number {
        const items = this.project?.invoice_items?.filter((x: InvoiceItem) => x.stage === stage && !x.invoice_id) ?? []
        if (!items.length) return 0
        return Math.max(...items.map((x: InvoiceItem) => x.position ?? 0)) + 1
    }

    #getCustomerVatCalculation(): InvoiceVatHandling {
        const projectItem = this.project?.invoice_items?.find((x: InvoiceItem) => x.vat_calculation !== undefined)
        if (projectItem?.vat_calculation !== undefined) return projectItem.vat_calculation as InvoiceVatHandling

        const companyItem = this.project?.company?.invoice_items?.find((x: InvoiceItem) => x.vat_calculation !== undefined)
        if (companyItem?.vat_calculation !== undefined) return companyItem.vat_calculation as InvoiceVatHandling

        return InvoiceVatHandling.Net
    }

    #openNewItemModal(stage: number, type: InvoiceItemType = InvoiceItemType.Default) {
        const newItem = InvoiceItem.fromJson({ type })
        ModalBaseService.open(
            ModalEditInvoiceItemComponent,
            newItem,
            this.project.company,
            $localize`:@@i18n.common.add:add`
        ).then((result: any) => {
            if (result?.item) {
                const item = InvoiceItem.fromJson(result.item)
                item.type = type
                this.#storeProjectItem(item, stage)
            }
        }).catch(() => { /* noop */ })
    }

    onCreateSupportRegularItem() { this.#openNewItemModal(1, InvoiceItemType.Default) }

    onCreateDownpaymentHeaderItem() { this.#openNewHeaderItem(2, true) }
    onCreateSupportHeaderItem()     { this.#openNewHeaderItem(1) }

    onCreateDownpaymentDiscountItem() { this.#openNewDiscountItem(2, true) }
    onCreateSupportDiscountItem()     { this.#openNewDiscountItem(1) }

    onCreateDownpaymentInstalmentItem() {
        ModalBaseService.open(ModalInvoiceAddInstalmentComponent, this.project, {
            defaultText: $localize`:@@i18n.common.downpayment:downpayment`
        }).then((item: InvoiceItem) => {
            if (!item) return

            const amount = Math.abs(Number(item.price) || 0)
            const text = item.text?.trim() || $localize`:@@i18n.common.downpayment:downpayment`
            const vatCalculation = this.#getCustomerVatCalculation()
            const vatRate = this.project.company.getInvoiceItemVatRate()

            const stage2Item = InvoiceItem.fromJson({
                text,
                type: InvoiceItemType.Default,
                stage: 2,
                price: amount,
                qty: 1,
                unit_name: 'Stk',
                vat_rate: vatRate,
                vat_calculation: vatCalculation,
                project_id: this.project.id,
            })

            const stage0Item = InvoiceItem.fromJson({
                text,
                type: InvoiceItemType.Paydown,
                stage: 0,
                price: amount,
                qty: -1,
                unit_name: 'Stk',
                vat_rate: vatRate,
                vat_calculation: vatCalculation,
                project_id: this.project.id,
            })

            const payload2 = stage2Item.getPrimitives(['my_prediction'])
            payload2.project_id = this.project.id
            payload2.invoice_id = null
            payload2.stage = 2
            payload2.position = this.#getNextPositionForStage(2)

            const payload0 = stage0Item.getPrimitives(['my_prediction'])
            payload0.project_id = this.project.id
            payload0.invoice_id = null
            payload0.stage = 0
            payload0.position = this.#getNextPositionForStage(0)

            forkJoin([
                stage2Item.store(payload2),
                stage0Item.store(payload0),
            ]).subscribe(() => this.parent.reload())
        }).catch(() => { /* noop */ })
    }

    #openNewHeaderItem(stage: number, switchToQuote = false) {
        this.#inputModalService.open('@@i18n.common.title').then((result) => {
            if (!result?.text) return
            const item = InvoiceItem.fromJson({
                type: InvoiceItemType.Header,
                text: result.text,
                qty: 1,
                price: 0,
            })
            this.#storeProjectItem(item, stage, switchToQuote)
        }).catch(() => { /* noop */ })
    }

    #openNewDiscountItem(stage: number, switchToQuote = false) {
        const basePrice = this.project?.net ?? 0
        ModalBaseService.open(ModalInvoiceDiscountComponent, $localize`:@@i18n.common.addDiscount:add discount`, basePrice).then((result: any) => {
            if (!result) return
            const item = InvoiceItem.fromJson({
                type: InvoiceItemType.Discount,
                text: result.title,
                price: result.price,
                qty: result.qty,
                unit_name: result.unit,
            })
            this.#storeProjectItem(item, stage, switchToQuote)
        }).catch(() => { /* noop */ })
    }
}
