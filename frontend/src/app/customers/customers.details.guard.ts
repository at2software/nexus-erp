import { inject, Service } from '@angular/core';
import { DetailGuard } from '@guards/detail.guard';
import { IHasFociGuard } from '@models/focus/has-foci.interface';
import { Company } from '@models/company/company.model';
import { CompanyService } from '@models/company/company.service';

@Service()
export class CustomerDetailGuard extends DetailGuard<Company> implements IHasFociGuard {
    service = inject(CompanyService);
    observable = (id: string) => this.service.show(id);
}
