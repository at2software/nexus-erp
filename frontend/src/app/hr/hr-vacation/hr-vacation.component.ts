import { ChangeDetectionStrategy, Component, effect, inject, input, signal, untracked } from '@angular/core';
import { VacationService } from '@models/vacation/vacation.service';
import { VacationGrant } from '@models/vacation/vacation-grant.model';
import { Vacation } from '@models/vacation/vacation.model';
import { User } from '@models/user/user.model';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { ModalEditVacationComponent } from '@app/_modals/modal-edit-vacation/modal-edit-vacation.component';
import { GlobalService } from '@models/global.service';
import { DecimalPipe, DatePipe } from '@angular/common';
import { Nx } from '@app/nx/nx.directive';
import { NgbDropdownModule, NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { SaldoChartComponent } from '@shards/saldo-chart/saldo-chart.component';
import { EmptyStateComponent } from '@shards/empty-state/empty-state.component';
import { SpinnerComponent } from "@shards/spinner/spinner.component";

@Component({
    changeDetection: ChangeDetectionStrategy.OnPush,
    selector: 'hr-vacation',
    templateUrl: './hr-vacation.component.html',
    styleUrls: ['./hr-vacation.component.scss'],
    standalone: true,
    imports: [DecimalPipe, DatePipe, Nx, NgbDropdownModule, NgbTooltipModule, SaldoChartComponent, EmptyStateComponent, SpinnerComponent],
})
export class HrVacationComponent {
    user = input.required<User>();
    isHr = input<boolean>(false);
    isLoading = signal(true);

    grants = signal<VacationGrant[]>([]);
    #vacationService = inject(VacationService);
    #modal = inject(ModalBaseService);
    #global = inject(GlobalService);

    constructor() {
        effect(() => {
            this.user();
            untracked(() => this.reload());
        });
    }
    reload() {
        this.isLoading.set(true);
        this.#vacationService.indexGrants(this.user()).subscribe((grants) => {
            grants.forEach((grant) => {
                grant.vacations.sort((a: Vacation, b: Vacation) => b.started_at!.localeCompare(a.started_at!));
            });
            this.grants.set(grants);
            this.isLoading.set(false);
        });
    }
    onVacationAdd(grant: VacationGrant) {
        this.#modal.open(ModalEditVacationComponent, Vacation.fromJson({}), this.user()).then((a: any) => {
            if (a) {
                a.vacation_grant_id = grant.id;
                a.approved_by_id = this.#global.user!.id;
                a.started_at = a.var.date;
                this.#vacationService.storeManual(a).subscribe(() => this.reload());
            }
        });
    }
    onFreeDayAdd(grant: VacationGrant) {
        this.#modal.open(ModalEditVacationComponent, Vacation.fromJson({}), this.user()).then((a: any) => {
            if (a) {
                a.vacation_grant_id = grant.id;
                a.approved_by_id = this.#global.user!.id;
                a.started_at = a.var.date;
                a.ended_at = a.time_started().add(a.var.amount, 'days');
                a.amount = 0;
                this.#vacationService.storeManual(a).subscribe(() => this.reload());
            }
        });
    }
}
