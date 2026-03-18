import { CommonModule } from '@angular/common';
import { Component, inject, OnDestroy, ViewChild, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { NexusModule } from '@app/nx/nexus.module';
import { ProjectDetailGuard } from '@app/projects/project-details.guard';
import { Assignee } from '@models/assignee/assignee.model';
import { AssignmentService } from '@models/assignee/assignment.service';
import { CompanyContact } from '@models/company/company-contact.model';
import { TBillingConsideration } from '@models/company/company.model';
import { GlobalService } from '@models/global.service';
import { InvoiceItem } from '@models/invoice/invoice-item.model';
import { InvoiceItemService } from '@models/invoice/invoice-item.service';
import { Project } from '@models/project/project.model';
import { ProjectService } from '@models/project/project.service';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { InvoiceItemType } from '../../../../enums/invoice-item.type';
import { PdfCreationType } from '../../../../enums/PdfCreationType';
import { Invoice } from '@models/invoice/invoice.model';
import { InvoicePrepareWrapper } from '@app/invoices/_shards/invoice-prepare-wrapper/invoice-prepare-wrapper';
import { Subscription } from 'rxjs';
import { ToastService } from '@shards/toast/toast.service';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { ModalEditInvoiceItemComponent } from '@app/_modals/modal-edit-invoice-item/modal-edit-invoice-item.component';

export enum TInvoicing { Quote, PartialInvoice, SupportInvoice, FinalInvoice }

@Component({
    selector: 'project-detail-quote',
    standalone: true,
    imports: [CommonModule, FormsModule, ToolbarComponent, InvoicePrepareWrapper, NexusModule, NgbTooltipModule, NgbDropdownModule],
    templateUrl: './project-invoicing.component.html',
    styleUrl: './project-invoicing.component.scss'
})
export class ProjectInvoicingComponent implements OnDestroy, OnInit {

    personalized?: CompanyContact
    invoiceNumber: string
    invoicingType: number
    quoteDescriptions: string[] = []
    downpayment: InvoiceItem
    downpaymentItems: InvoiceItem[] = []
    invoicedUntil?: string = undefined
    supportItems: InvoiceItem[] = []
    finalItems: InvoiceItem[] = []
    isCreatingInvoice = false
    currentBillingConsiderations: TBillingConsideration[] = []
    #subscription?: Subscription
    #loadingInvoiceItems = false

    project: Project
    #projectService = inject(ProjectService)
    #invoiceItemService = inject(InvoiceItemService)
    #assignmentService = inject(AssignmentService)
    #global = inject(GlobalService)
    #router = inject(Router)
    #toastService = inject(ToastService)
    parent = inject(ProjectDetailGuard)
    #inputModalService = inject(InputModalService)

    get global() { return this.#global; }

    @ViewChild(InvoicePrepareWrapper) invoicingContent: InvoicePrepareWrapper

    ngOnInit() {

        this.invoiceNumber = Invoice.formattedInvoiceNumber()
        this.#subscription = this.parent.onChange.subscribe(() => {
            this.project = this.parent.current

            if (this.project.is_time_based) this.invoicingType = TInvoicing.SupportInvoice
            else if (this.project.state.isFinishedSuccessful()) this.invoicingType = TInvoicing.FinalInvoice
            else if (this.project.state.isPrepared()) this.invoicingType = TInvoicing.Quote
            else if (this.project.state.isRunning()) this.invoicingType = TInvoicing.Quote
            else this.invoicingType = TInvoicing.PartialInvoice

            this.downpayment = InvoiceItem.fromJson({
                text: 'Downpayment',
                class: 'InvoiceItem',
                price: this.project.net,
                total: this.project.net * .3,
                net: this.project.net * .3,
                vat_rate: this.project.company.getInvoiceItemVatRate(),
                isNonPersistantRecord: true,
                qty: 30,
                unit_name: '%',
                type: InvoiceItemType.PreparedInstalment
            })
            this.downpayment.company = this.project.company
            this.downpayment.updateDynamicAttributes()
            this.downpaymentItems = [this.downpayment]

            this.personalized = this.project.assignees.filter(a => a.company_contact_id).map(a => Assignee.fromJson(a)).first()?.assignee as CompanyContact

            this.quoteDescriptions = this.project.quote_descriptions || []
            this.invoicedUntil = ''

            // Load invoice items with pricing data to avoid race condition
            if (!this.#loadingInvoiceItems) {
                this.#loadingInvoiceItems = true
                this.#invoiceItemService.getInvoiceItems(this.project, { append: 'my_prediction', with: 'predictions', 'only_unbilled': true }).subscribeAndMerge(this.project, 'invoice_items', () => {
                    this.assignItems()
                    this.#loadingInvoiceItems = false
                })
            }
        })
    }

    ngOnDestroy() {
        this.#subscription?.unsubscribe()
        this.#loadingInvoiceItems = false
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

    #isSupportItem = (x: InvoiceItem) => (x.type === InvoiceItemType.PreparedSupport) && !x.invoice_id
    assignItems() {
        this.supportItems = this.project.invoice_items.filter((x: any) => this.#isSupportItem(x))
        this.finalItems = this.project.invoice_items.filter((x: any) => !this.#isSupportItem(x) && !x.invoice_id)
    }

    moveSupportToCustomer() {
        this.#projectService.moveSupportToCustomer(this.project).subscribe(() => this.#gotoCompanyInvoicing())
    }
    prepareInvoice() {
        this.#projectService.moveRegularItemsToCustomer(this.project).subscribe(_ => {
            this.#router.navigate(['/customers/' + this.project.company_id + '/billing'])
        })
    }
    makeInvoice = () => {
        this.isCreatingInvoice = true
        this.invoicingContent?.table?.clear()
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
            case 1: return this.#projectService.makeInstallmentInvoice(this.project, [this.downpayment], callback)
            case 2: return this.#projectService.makeInvoice(this.project, this.invoicingType, callback)
            case 3: return this.#projectService.makeInvoice(this.project, this.invoicingType, callback)
        }
    }
    #gotoCompanyInvoicing = () => this.#router.navigate(['customers/' + this.project.company.id + '/billing'])
    #gotoCompanyInvoices = () => this.#router.navigate(['customers/' + this.project.company.id + '/invoices'])

    onAddCompanyContact(x: CompanyContact) {
        const assignment = this.project.assignees.find((a: Assignee) => a.assignee === x);
        if (assignment) {
            // Contact already assigned, just set as main contact
            this.#assignmentService.setMainContact(this.parent.current, assignment.id).subscribe(() => {
                this.parent.reload();
            });
        } else {
            // Contact not assigned yet, assign them first then set as main contact
            this.#assignmentService.addToProject(this.parent.current, { id: x.id, class: 'company_contact' }).subscribe((newAssignment: Assignee) => {
                this.#assignmentService.setMainContact(this.parent.current, newAssignment.id).subscribe(() => {
                    this.parent.reload();
                });
            });
        }
    }

    getAssignedContacts = (): CompanyContact[] => {
        // Return all non-retired company employees instead of just assigned contacts
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
        this.invoicingType = newType
        // Reload invoice items with correct pricing for the new type
        if (!this.#loadingInvoiceItems) {
            this.#loadingInvoiceItems = true
            this.#invoiceItemService.getInvoiceItems(this.project, { append: 'my_prediction', with: 'predictions' }).subscribeAndMerge(this.project, 'invoice_items', () => {
                this.assignItems()
                this.#loadingInvoiceItems = false
            })
        }
    }

    onCreateNewSupportItem() {
        const newItem = InvoiceItem.fromJson({})
        ModalBaseService.open(
            ModalEditInvoiceItemComponent,
            newItem,
            this.project.company,
            $localize`:@@i18n.common.add:add`
        ).then((result: any) => {
            if (result?.item) {
                result.item.type = InvoiceItemType.PreparedSupport
                result.item.project_id = this.project.id
                result.item.store().subscribe(() => {
                    this.#invoiceItemService.getInvoiceItems(this.project, { append: 'my_prediction', with: 'predictions', 'only_unbilled': true }).subscribeAndMerge(this.project, 'invoice_items', () => this.assignItems())
                })
            }
        }).catch(() => {})
    }
}
