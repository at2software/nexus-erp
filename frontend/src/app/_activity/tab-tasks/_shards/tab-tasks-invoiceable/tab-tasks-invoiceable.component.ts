import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DecimalPipe } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NComponent } from '@shards/n/n.component';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { REFLECTION } from '@constants/constants';
import { Company } from '@models/company/company.model';
import { Project } from '@models/project/project.model';
import { WidgetService } from '@models/widget.service';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { MoneyShortPipe } from '@pipes/mshort.pipe';
import { TabTasksBaseComponent } from '../tab-tasks-base.component';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'tab-tasks-invoiceable',
    templateUrl: './tab-tasks-invoiceable.component.html',
    imports: [NComponent, AvatarComponent, RouterModule, NgbTooltipModule, MoneyShortPipe, DecimalPipe],
})
export class TabTasksInvoiceableComponent extends TabTasksBaseComponent {
    timeBased = signal<Project[]>([]);
    customerSupport = signal<Company[]>([]);
    preparedInvoices = signal<(Company | Project)[]>([]);

    #widgetService = inject(WidgetService);

    override reload() {
        this.#widgetService
            .indexCashflow('PROJECTS_TIMEBASED', {}, Project)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((response) => {
                this.timeBased.set(this.#positiveDesc([response.objects].flat(), (p) => p.uninvoiced_hours));
            });
        this.#widgetService
            .indexCashflow('CUSTOMER_SUPPORT', {}, Company)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((response) => {
                this.customerSupport.set(this.#positiveDesc([response.objects].flat(), (c) => c.foci_unbilled_sum_duration));
            });
        this.#widgetService
            .preparedInvoices()
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((response) => {
                const objects = Object.values(response)
                    .map((x) => REFLECTION<Company | Project>(x))
                    .filter((x) => x instanceof Company || x instanceof Project);
                this.preparedInvoices.set(this.#positiveDesc(objects, (x) => x.net_remaining));
            });
    }

    #positiveDesc = <T>(items: T[], by: (item: T) => number | null | undefined): T[] => items
        .filter((item) => (by(item) ?? 0) > 0)
        .sort((a, b) => (by(b) ?? 0) - (by(a) ?? 0));

    asProject = (_: Company | Project) => _ as Project;
    asCompany = (_: Company | Project) => _ as Company;
}
