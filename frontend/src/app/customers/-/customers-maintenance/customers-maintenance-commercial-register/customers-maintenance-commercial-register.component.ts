import { ChangeDetectionStrategy, Component, inject, linkedSignal } from '@angular/core';
import { Company } from '@models/company/company.model';
import { CompanyService } from '@models/company/company.service';
import { modelListResource } from '@models/http/model-resource';
import { AMTSGERICHTE } from '../amtsgerichte.data';
import { debounceTime, map, Observable, OperatorFunction } from 'rxjs';
import { Nx } from '@app/nx/nx.directive';
import { AvatarComponent } from '@shards/avatar/avatar.component';
import { FormsModule } from '@angular/forms';
import { NgbTypeaheadModule } from '@ng-bootstrap/ng-bootstrap';
import { StackedTableDirective } from '@directives/stacked-table.directive';

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'customers-maintenance-commercial-register',
    templateUrl: './customers-maintenance-commercial-register.component.html',
    imports: [StackedTableDirective, Nx, AvatarComponent, FormsModule, NgbTypeaheadModule],
})
export class CustomersMaintenanceCommercialRegisterComponent {
    amtsgerichte: string[] = [
        ...new Set(
            AMTSGERICHTE.daten.map((_: (string | null)[]) => {
                _[1] = _[1]?.replace('Amtsgericht ', '') ?? '';
                return _[1];
            }),
        ),
    ];

    #companyService = inject(CompanyService);

    #companies = modelListResource(() => this.#companyService.maintenanceCommercialRegister());
    companies = linkedSignal<Company[], Company[]>({
        source: this.#companies.value,
        computation: (rows) => {
            rows.forEach((_) => (_.var.parts = ['HRB', '', '']));
            return rows;
        },
    });

    onUpdate(company: Company) {
        if (company.var.parts[0].length && company.var.parts[1].length && company.var.parts[2].length) {
            company.update({ commercial_register: company.var.parts.join('|') }).subscribe();
        }
    }
    search: OperatorFunction<string, readonly string[]> = (text$: Observable<string>) =>
        text$.pipe(
            debounceTime(200),
            map((x: string) => (x === '' ? [] : this.amtsgerichte!.filter((v) => v.toLowerCase().match(x.toLowerCase())))),
        );
}
