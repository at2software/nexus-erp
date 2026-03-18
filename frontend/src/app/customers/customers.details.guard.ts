import { Injectable, inject } from "@angular/core"
import { DetailGuard } from "@guards/detail.guard"
import { IHasFociGuard } from "@models/focus/hasFoci.interface"
import { Company } from "src/models/company/company.model"
import { CompanyService } from "src/models/company/company.service"

@Injectable({ providedIn: 'root' })
export class CustomerDetailGuard extends DetailGuard<Company> implements IHasFociGuard {
    service = inject(CompanyService)
    observable = (id:string) => this.service.show(id)
}