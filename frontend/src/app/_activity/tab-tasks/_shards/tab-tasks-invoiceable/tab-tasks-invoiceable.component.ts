import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NexusModule } from '@app/nx/nexus.module';
import { REFLECTION } from '@constants/constants';
import { Company } from '@models/company/company.model';
import { Project } from '@models/project/project.model';
import { WidgetService } from '@models/widget.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { MoneyShortPipe } from 'src/pipes/mshort.pipe';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';

@Component({
    selector: 'tab-tasks-invoiceable',
    templateUrl: './tab-tasks-invoiceable.component.html',
    standalone: true,
    imports: [NexusModule, RouterModule, NgbTooltipModule, MoneyShortPipe, DecimalPipe]
})
export class TabTasksInvoiceableComponent extends TabTasksBaseComponent {

    timeBased: Project[] = []
    customerSupport: Company[] = []
    preparedInvoices: (Company | Project)[] = []

    #widgetService = inject(WidgetService)

    override reload() {
        this.#widgetService.indexCashflow('PROJECTS_TIMEBASED', {}, Project).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((response: any) => {
            this.timeBased = (response.objects || [])
                .filter((p: Project) => (p.uninvoiced_hours ?? 0) > 0)
                .sort((a: Project, b: Project) => (b.uninvoiced_hours ?? 0) - (a.uninvoiced_hours ?? 0))
        })
        this.#widgetService.indexCashflow('CUSTOMER_SUPPORT', {}, Company).pipe(takeUntilDestroyed(this.destroyRef)).subscribe((response: any) => {
            this.customerSupport = (response.objects || [])
                .filter((c: Company) => (c.foci_unbilled_sum_duration ?? 0) > 0)
                .sort((a: Company, b: Company) => (b.foci_unbilled_sum_duration ?? 0) - (a.foci_unbilled_sum_duration ?? 0))
        })
        this.#widgetService.preparedInvoices().pipe(takeUntilDestroyed(this.destroyRef)).subscribe((_: any) => {
            this.preparedInvoices = Object.values(_)
                .map(x => REFLECTION<Company | Project>(x))
                .filter(x => x instanceof Company || x instanceof Project)
                .filter((x: Company | Project) => (x.net_remaining ?? 0) > 0)
                .sort((a: any, b: any) => (b.net_remaining ?? 0) - (a.net_remaining ?? 0))
        })
    }

    asProject = (_: Company | Project) => _ as Project
    asCompany = (_: Company | Project) => _ as Company
}
