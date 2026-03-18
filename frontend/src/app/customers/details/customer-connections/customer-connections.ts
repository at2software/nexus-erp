import { Component, inject, ViewChild, OnInit } from '@angular/core';
import { CompanyService } from '@models/company/company.service';
import { Connection } from '@models/company/connection.model';
import { Company } from '@models/company/company.model';
import { CustomerDetailGuard } from '@app/customers/customers.details.guard';
import { NetworkChart } from '@shards/network-chart/network-chart.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { NexusModule } from '@app/nx/nexus.module';


@Component({
    selector: 'customer-connections',
    templateUrl: './customer-connections.html',
    styleUrls: ['./customer-connections.scss'],
    standalone: true,
    imports: [ScrollbarComponent, NgbPopoverModule, SearchInputComponent, NexusModule, NetworkChart]
})
export class CustomerConnections implements OnInit {

    connections:Connection[] = []

    parent = inject(CustomerDetailGuard)
    #companyService = inject(CompanyService)

    @ViewChild(NetworkChart) chart:NetworkChart
    @ViewChild('popSearch') popSearch:SearchInputComponent

    ngOnInit() {
        this.parent.onChange.subscribe(() => {
            this.reload()
        })
    }

    reload() {
        this.#companyService.showConnections(this.parent.current).subscribe(data => {
            this.connections = data
            this.connections.forEach(_ => _.addCompanyAction(_.otherCompany(this.parent.current)))
        })
    }
    singleActionResolved() {
        this.chart.updateData()
    }
    onCompanySelect(_:Company) {
        Connection.fromJson({
            company1_id: this.parent.current.id,
            company2_id: _.id,
        }).store().subscribe(_ => {
            const n = Connection.fromJson(_)
            n.addCompanyAction(n.otherCompany(this.parent.current))
            this.connections.push(n)
            this.chart.updateData()
        })
    }

    createNewCompany(searchInput: any) {
        if (!searchInput.query) return

        this.#companyService.create(searchInput.query).subscribe((company: any) => {
            const newCompany = Company.fromJson(company)
            this.onCompanySelect(newCompany)
        })
    }

    onPopoverShown() {
        setTimeout(() => this.popSearch?.focus(), 0)
    }

}
