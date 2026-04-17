import { Component, inject, OnChanges, input } from '@angular/core';
import { VacationService } from 'src/models/vacation/vacation.service';
import { VacationGrant } from 'src/models/vacation/vacation-grant.model';
import { Vacation } from 'src/models/vacation/vacation.model';
import { User } from 'src/models/user/user.model';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { ModalEditVacationComponent } from '@app/_modals/modal-edit-vacation/modal-edit-vacation.component';
import { GlobalService } from 'src/models/global.service';
import { CommonModule, DatePipe } from '@angular/common';
import { NexusModule } from '@app/nx/nexus.module';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SaldoChartComponent } from '@shards/saldo-chart/saldo-chart.component';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';

@Component({
    selector: 'hr-vacation',
    templateUrl: './hr-vacation.component.html',
    styleUrls: ['./hr-vacation.component.scss'],
    standalone: true,
    imports: [CommonModule, DatePipe, NexusModule, NgbDropdownModule, NgbTooltipModule, SaldoChartComponent, EmptyStateComponent]
})
export class HrVacationComponent implements OnChanges {
    
    user = input.required<User>()
    isHr = input<boolean>(false)

    grants:VacationGrant[] = []
    #vacationService = inject(VacationService)
    #modal = inject(ModalBaseService)
    #global = inject(GlobalService)

    ngOnChanges(changes:any) {
        if ('user' in changes) {
            this.reload()
        }
    }
    reload() {
        this.#vacationService.indexGrants(this.user()).subscribe(grants => {
            this.grants = grants
            grants.forEach(grant => {
                grant.vacations.sort((a:Vacation,b:Vacation) => b.started_at!.localeCompare(a.started_at!))
            })
        })
    }
    onVacationAdd(grant:VacationGrant) {
        this.#modal.open(ModalEditVacationComponent, Vacation.fromJson({}), this.user).then((a:any) => {
            if (a) {
                a.vacation_grant_id = grant.id
                a.approved_by_id = this.#global.user!.id
                a.started_at = a.var.date
                this.#vacationService.storeManual(a).subscribe(() => this.reload())
            }
        })
    }
    onFreeDayAdd(grant:VacationGrant) {
        this.#modal.open(ModalEditVacationComponent, Vacation.fromJson({}), this.user).then((a:any) => {
            if (a) {
                a.vacation_grant_id = grant.id
                a.approved_by_id = this.#global.user!.id
                a.started_at = a.var.date
                a.ended_at = a.time_started().add(a.var.amount, 'days')
                a.amount = 0
                this.#vacationService.storeManual(a).subscribe(() => this.reload())
            }
        })
    }

}
