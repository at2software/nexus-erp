import { ChangeDetectionStrategy, Component, effect, inject, signal, untracked, viewChild } from '@angular/core';
import { tracked } from '@constants/tracked';
import { Router } from '@angular/router';
import { CompanyService } from '@models/company/company.service';
import { Connection } from '@models/company/connection.model';
import { Company } from '@models/company/company.model';
import { CustomerDetailGuard } from '@app/customers/customers.details.guard';
import { NetworkChart } from '@shards/network-chart/network-chart.component';
import { ScrollbarComponent } from '@app/app/scrollbar/scrollbar.component';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';

@Component({
    selector: 'customer-connections',
    templateUrl: './customer-connections.html',
    styleUrls: ['./customer-connections.scss'],
    standalone: true,
    imports: [ScrollbarComponent, NgbPopoverModule, SearchInputComponent, Nx, AvatarComponent, NetworkChart],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CustomerConnections {
    #parent = inject(CustomerDetailGuard);
    #companyService = inject(CompanyService);
    #router = inject(Router);

    myCompany = tracked(this.#parent.object);
    connections = signal<Connection[]>([]);
    selectedCompany = signal<Company | null>(null);

    chart = viewChild.required(NetworkChart);
    popSearch = viewChild<SearchInputComponent>('popSearch');

    constructor() {
        effect(() => {
            this.myCompany();
            untracked(() => this.reload());
        });
    }

    reload() {
        const myCompany = this.myCompany();
        this.#companyService.showConnections(myCompany).subscribe((data) => {
            data.forEach((_) => _.addCompanyAction(_.otherCompany(myCompany)));
            this.connections.set(data);
        });
    }

    singleActionResolved() {
        this.chart().updateData();
    }

    onCompanySelect(_: Company) {
        const myCompany = this.myCompany();
        Connection.fromJson({ company1_id: myCompany.id, company2_id: _.id })
            .store()
            .subscribe((_) => {
                const n = Connection.fromJson(_);
                n.addCompanyAction(n.otherCompany(myCompany));
                this.connections.update((connections) => [...connections, n]);
                this.chart().updateData();
            });
    }

    createNewCompany(searchInput: any) {
        if (!searchInput.query) return;
        this.#companyService.create(searchInput.query).subscribe((company: any) => {
            this.onCompanySelect(Company.fromJson(company));
        });
    }

    onNodeSelected(companyId: string | null) {
        if (!companyId) {
            this.selectedCompany.set(null);
            return;
        }
        for (const conn of this.connections()) {
            if (String(conn.company1?.id) === companyId) { this.selectedCompany.set(conn.company1); return; }
            if (String(conn.company2?.id) === companyId) { this.selectedCompany.set(conn.company2); return; }
        }
    }

    navigateToCompany() {
        const selectedCompany = this.selectedCompany();
        if (selectedCompany) this.#router.navigate(['/customers', selectedCompany.id]);
    }

    onPopoverShown() {
        setTimeout(() => this.popSearch()?.focus(), 0);
    }
}
