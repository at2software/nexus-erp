import { inject, Injectable } from '@angular/core';
import { DetailGuard } from '@guards/detail.guard';
import { Vacation } from '@models/vacation/vacation.model';
import { VacationService } from '@models/vacation/vacation.service';

@Injectable({ providedIn: 'root' })
export class VacationGuardComponent extends DetailGuard<Vacation> {
    service = inject(VacationService);
    observable = (id: string) => this.service.show(id);
}
