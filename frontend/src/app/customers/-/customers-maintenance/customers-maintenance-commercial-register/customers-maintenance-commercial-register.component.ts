import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { Company } from '@models/company/company.model';
import { CompanyService } from '@models/company/company.service';
import { AMTSGERICHTE } from '../amtsgerichte.data';
import { debounceTime, map, Observable, OperatorFunction } from 'rxjs';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { FormsModule } from '@angular/forms';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'customers-maintenance-commercial-register',
    templateUrl: './customers-maintenance-commercial-register.component.html',
    styleUrls: ['./customers-maintenance-commercial-register.component.scss'],
    standalone: true,
    imports: [Nx, AvatarComponent, FormsModule, NgbTypeaheadModule],
})
export class CustomersMaintenanceCommercialRegisterComponent implements OnInit {
    companies = signal<Company[]>([]);

    amtsgerichte: string[] = [
        ...new Set(
            AMTSGERICHTE.daten.map((_: (string | null)[]) => {
                _[1] = _[1]?.replace('Amtsgericht ', '') ?? '';
                return _[1];
            }),
        ),
    ];

    #companyService = inject(CompanyService);

    ngOnInit() {
        this.#companyService.maintenanceCommercialRegister().subscribe((reply) => {
            reply.forEach((_) => (_.var.parts = ['HRB', '', '']));
            this.companies.set(reply);
        });
    }
    onUpdate(company: Company) {
        if (company.var.parts[0].length && company.var.parts[1].length && company.var.parts[2].length) {
            company.update({ commercial_register: company.var.parts.join('|') }).subscribe();
        }
    }
    search: OperatorFunction<string, readonly string[]> = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(200),
            map((x: any) => (x === '' ? [] : this.amtsgerichte!.filter((v) => v.toLowerCase().match(x.toLowerCase())))),
        );
}
