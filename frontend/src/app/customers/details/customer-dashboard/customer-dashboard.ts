import { Component, OnInit, ViewChildren, inject } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { Assignee } from '@models/assignee/assignee.model';
import { Invoice } from '@models/invoice/invoice.model';
import { InputModalService } from '@app/_modals/modal-input/modal-input.component';
import { CompanyContact } from '@models/company/company-contact.model';
import { GlobalService } from '@models/global.service';
import { LineChartRangeComponent } from '@charts/chart-card-base/chart-card-range.component';
import { VcardClass } from '@models/vcard/VcardClass';
import { AssignmentService } from '@models/assignee/assignment.service';
import { Product } from '@models/product/product.model';
import { ProductService } from '@models/product/product.service';
import { CustomerDetailGuard } from '@app/customers/customers.details.guard';
import { Serializable } from '@models/serializable';
import { ProjectService } from '@models/project/project.service';
import { InvoiceService } from '@models/invoice/invoice.service';
import { ToolbarComponent } from '@app/app/toolbar/toolbar.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';

import { ListGroupItemContactComponent } from '@app/customers/_shards/list-group-item-contact/list-group-item-contact.component';
import { PermissionsDirective } from '@directives/permissions.directive';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { NgbTooltipModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { FormsModule } from '@angular/forms';
import { CustomerQuickstatsComponent } from '@app/customers/_shards/customer-quickstats/customer-quickstats.component';
import { ProjectsTableComponent } from '@app/projects/_shards/projects-table/projects-table.component';
import { InvoicesTable } from '@app/invoices/_shards/invoices-table/invoices-table';
import { NexusModule } from '@app/nx/nexus.module';
import { ProjectTeamPlanningComponent } from "@app/projects/_shards/project-team-planning/project-team-planning.component";
import { HotkeyDirective } from '@directives/hotkey.directive';
import { SafePipe } from '../../../../pipes/safe.pipe';
import { PercentPipe } from '@angular/common';
import { MediaPreviewComponent } from '@app/projects/id/project-media/media-preview/media-preview.component';
import { CompanyLocaleSelectorComponent } from '@app/customers/_shards/company-locale-selector/company-locale-selector.component';

const REMARKETING_INTERVALS:Record<number, string> = {
    0: $localize`:@@i18n.common.none:none`,
    1: $localize`:@@i18n.common.daily:daily`,
    4: $localize`:@@i18n.common.weekly:weekly`,
    5: $localize`:@@i18n.marketing.everyTwoWeeks:every two weeks`,
    2: $localize`:@@i18n.common.monthly:monthly`,
    6: $localize`:@@i18n.marketing.everyTwoMonths:every two months`,
    7: $localize`:@@i18n.marketing.everyThreeMonths:every three months`,
    8: $localize`:@@i18n.marketing.everySixMonths:every six months`,
    3: $localize`:@@i18n.common.yearly:yearly`,
}
@Component({
    selector: 'customer-dashboard',
    templateUrl: './customer-dashboard.html',
    styleUrls: ['./customer-dashboard.scss'],
    standalone: true,
    imports: [ToolbarComponent, ScrollbarComponent, ListGroupItemContactComponent, SearchInputComponent, NgbTooltipModule, NgbDropdownModule, FormsModule, RouterModule, CustomerQuickstatsComponent, MediaPreviewComponent, ProjectsTableComponent, InvoicesTable, LineChartRangeComponent, NexusModule, ProjectTeamPlanningComponent, HotkeyDirective, SafePipe, PercentPipe, CompanyLocaleSelectorComponent]
})

export class CustomerDashboard implements OnInit {

    invoices           : Invoice[] = []
    assignees          : Assignee[] = []
    dataIntensity      : any[]
    quickContacts      : CompanyContact[] = []
    canBeAssigned      : Assignee[]
    product           ?: Product
    leadSource        ?: Serializable
    showDefaultProduct : boolean = false
    showLeadSource     : boolean = false
    showRemarketing    : boolean = false

    parent             = inject(CustomerDetailGuard)
    #router            = inject(Router)
    global             = inject(GlobalService)
    #inputModalService = inject(InputModalService)
    #projectService    = inject(ProjectService)
    #invoiceService    = inject(InvoiceService)
    #assignmentService = inject(AssignmentService)
    #productService    = inject(ProductService)

    @ViewChildren(LineChartRangeComponent) charts:LineChartRangeComponent[]

    ngOnInit(): void {
        this.parent.onChange.subscribe(() => {
            const _ = this.parent.current
            if (this.global.user?.hasRole('invoicing')) {
                this.#invoiceService.index({ company_id: _.id, onlyUnpaid: 'true' }).subscribe((x: any) => this.invoices = x.data)
            }
            if (_.default_product_id) {
                this.#productService.show(_.default_product_id).subscribe((p: Product) => {
                    this.product = p
                })
            }
            this.quickContacts = _.employees.filter(u => u.is_favorite)
            this.assignees = this.parent.current.assignees.filter(_ => _.assignee?.class == 'User')
            this.canBeAssigned = Object.values(this.global.team).map(_ => Assignee.newU(_)).filter(x => this.assignees.filter(a => a.user_id == x.user_id).length == 0)
        })
    }
    reload() {
        this.parent.reload()
    }
    getIntervalText = (_:any) => REMARKETING_INTERVALS[_]
    getIntervalKeys = () => Object.keys(REMARKETING_INTERVALS)
    getIntervalIcon = (_:any) => {
        const icons:Record<number, string> = {
            0: '--',
            1: '1D',
            4: '1W',
            5: '2W',
            2: '1M',
            6: '2M',
            7: '3M',
            8: '6M',
            3: '1Y',
        }
        return icons[_] || 'schedule'
    }

    onAddProject = () => {
        this.#inputModalService.open("@@i18n.common.name").confirmed(({ text }) => {
            this.#projectService.addProject(this.parent.current.id, text).subscribe((x: any) => this.#router.navigate(['/projects/' + x.id]))
        })
    }
    onProductSelect(_: Product) {
        this.parent.current.default_product_id = _.id
        this.product = _
        this.parent.current.update({ default_product_id: _.id }).subscribe()
    }
    
    addUser(x: VcardClass) {
        this.#assignmentService.addToCompany(this.parent.current, { id: x.id, class: 'user' }).subscribe(()=> this.reload())
    }
    onLeadSourceSelected(_:Serializable) {
        this.parent.current.update({ source_type: 'App\\Models\\' + _.class, source_id:_.id}).subscribe(r => this.parent.current.setSource(r))
    }
}
