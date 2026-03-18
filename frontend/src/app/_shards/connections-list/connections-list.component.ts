import { Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, inject } from '@angular/core';
import { CompanyService } from 'src/models/company/company.service';
import { Connection } from 'src/models/company/connection.model';
import { Company } from 'src/models/company/company.model';
import { NgbPopoverModule } from '@ng-bootstrap/ng-bootstrap';
import { SearchInputComponent } from '@shards/search-input/search-input.component';
import { NexusModule } from '@app/nx/nexus.module';
import { CommonModule } from '@angular/common';
import { NxGlobal } from '@app/nx/nx.global';

@Component({
    selector: 'connections-list',
    templateUrl: './connections-list.component.html',
    styleUrls: ['./connections-list.component.scss'],
    standalone: true,
    imports: [CommonModule, NgbPopoverModule, SearchInputComponent, NexusModule]
})
export class ConnectionsListComponent implements OnInit, OnChanges {

    @Input() company!: Company;
    @Input() showAddButton: boolean = false;
    @Input() hideMyCompany: boolean = false;
    @Output() added = new EventEmitter<Connection>();
    @Output() updated = new EventEmitter<void>();

    connections: Connection[] = [];
    filteredConnections: Connection[] = [];
    #companyService = inject(CompanyService);

    ngOnInit() {
        this.reload();
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes['hideMyCompany'] && !changes['hideMyCompany'].firstChange) {
            this.applyFilters();
        }
    }

    reload() {
        if (!this.company) return;

        this.#companyService.showConnections(this.company).subscribe(data => {
            this.connections = data;
            this.connections.forEach(_ => _.addCompanyAction(_.otherCompany(this.company)));
            this.applyFilters();
        });
    }

    applyFilters() {
        let filtered = [...this.connections];

        if (this.hideMyCompany) {
            filtered = filtered.filter(connection => {
                const otherCompany = connection.otherCompany(this.company);
                return otherCompany?.id !== NxGlobal.ME_ID;
            });
        }

        this.filteredConnections = filtered;
    }

    singleActionResolved() {
        this.updated.emit();
        this.reload();
    }

    onCompanySelect(_: Company) {
        Connection.fromJson({
            company1_id: this.company.id,
            company2_id: _.id,
        }).store().subscribe(_ => {
            const n = Connection.fromJson(_);
            n.addCompanyAction(n.otherCompany(this.company));
            this.connections.push(n);
            this.applyFilters();
            this.updated.emit();
        });
    }

    createNewCompany(searchInput: any) {
        if (!searchInput.query) return

        this.#companyService.create(searchInput.query).subscribe((company: any) => {
            const newCompany = Company.fromJson(company)
            this.onCompanySelect(newCompany)
        })
    }

    addConnection(connection: Connection) {
        this.added.emit(connection);
    }
}
