import { Component, computed, effect, inject, input, output, signal } from '@angular/core';
import { CompanyService } from 'src/models/company/company.service';
import { Connection } from 'src/models/company/connection.model';
import { Company } from 'src/models/company/company.model';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { NexusModule } from '@app/nx/nexus.module';
import { NxGlobal } from '@app/nx/nx.global';

@Component({
    selector: 'connections-list',
    templateUrl: './connections-list.component.html',
    styleUrls: ['./connections-list.component.scss'],
    standalone: true,
    imports: [NgbPopoverModule, SearchInputComponent, NexusModule]
})
export class ConnectionsListComponent {

    company = input<Company>();
    showAddButton = input(false);
    hideMyCompany = input(false);
    added = output<Connection>();
    updated = output<void>();

    connections = signal<Connection[]>([]);
    filteredConnections = computed(() => {
        const company = this.company();
        const connections = this.connections();
        if (!this.hideMyCompany() || !company) return connections;
        return connections.filter(c => c.otherCompany(company)?.id !== NxGlobal.ME_ID);
    });

    #companyService = inject(CompanyService);

    constructor() {
        effect(() => this.reload());
    }

    reload() {
        const company = this.company();
        if (!company) return;

        this.#companyService.showConnections(company).subscribe(data => {
            data.forEach(c => c.addCompanyAction(c.otherCompany(company)));
            this.connections.set(data);
        });
    }

    singleActionResolved() {
        this.updated.emit();
        this.reload();
    }

    onCompanySelect(selected: Company) {
        const company = this.company();
        if (!company) return;

        Connection.fromJson({
            company1_id: company.id,
            company2_id: selected.id,
        }).store().subscribe(data => {
            const connection = Connection.fromJson(data);
            connection.addCompanyAction(connection.otherCompany(company));
            this.connections.update(list => [...list, connection]);
            this.updated.emit();
        });
    }

    createNewCompany(searchInput: { query: () => string }) {
        if (!searchInput.query()) return;
        this.#companyService.create(searchInput.query()).subscribe(data => {
            this.onCompanySelect(Company.fromJson(data));
        });
    }

    addConnection(connection: Connection) {
        this.added.emit(connection);
    }
}
