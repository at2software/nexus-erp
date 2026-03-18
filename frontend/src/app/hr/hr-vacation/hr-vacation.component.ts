import { Component, Input, inject, OnChanges } from '@angular/core';
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
    
    @Input() user:User
    @Input() isHr:boolean = false

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
        this.#vacationService.indexGrants(this.user).subscribe(grants => {
            this.grants = grants
            grants.forEach(grant => {
                grant.vacations.sort((a:Vacation,b:Vacation) => b.started_at!.localeCompare(a.started_at!))
            })
        })
    }
    remainingVacationFor = (_:VacationGrant) => _.amount + _.vacations.reduce((acc:number, curr:Vacation) => acc + curr.delta(), 0)
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

    getVacationStateIcon(state: number): string {
        switch (state) {
            case 0: return 'schedule' // Pending/Requested
            case 1: return 'check_circle' // Approved
            case 2: return 'cancel' // Denied/Rejected
            case 3: return 'healing' // Sick leave
            case 4: return 'block' // Cancelled
            default: return 'help'
        }
    }

    getVacationStateClass(state: number): string {
        switch (state) {
            case 0: return 'text-warning' // Pending - yellow/orange
            case 1: return 'text-success' // Approved - green
            case 2: return 'text-danger' // Denied - red
            case 3: return 'text-info' // Sick leave - blue
            case 4: return 'text-muted' // Cancelled - grey
            default: return 'text-muted'
        }
    }

    getVacationStateTooltip(state: number): string {
        switch (state) {
            case 0: return $localize`:@@i18n.vacation.state.pending:pending`
            case 1: return $localize`:@@i18n.common.approved:approved`
            case 2: return $localize`:@@i18n.common.denied:denied`
            case 3: return $localize`:@@i18n.vacation.state.sick:sick leave`
            case 4: return $localize`:@@i18n.vacation.state.cancelled:cancelled`
            default: return $localize`:@@i18n.common.unknown:unknown`
        }
    }

    getVacationChartMin(grant: VacationGrant): number {
        // Find the most negative balance during the year
        let runningTotal = grant.amount
        let minValue = 0
        
        // Calculate running totals to find the lowest point
        // Only include approved vacations (state 1) and sick leave (state 3)
        grant.vacations.forEach(vacation => {
            if ([1, 3].includes(vacation.state)) { // Only count approved and sick leave
                runningTotal += vacation.amount // amount is negative for vacation taken
                if (runningTotal < minValue) {
                    minValue = runningTotal
                }
            }
        })
        
        return Math.min(minValue, -grant.amount * 0.2) // Allow some padding below zero
    }

    getVacationChartMax(grant: VacationGrant): number {
        return grant.amount * 1.1 // Slightly above the initial grant for visual padding
    }

    getVacationChartDx(grant: VacationGrant, currentVacation: Vacation): number {
        // Bottom row starts with grant.amount, then we work upwards
        // Since table is sorted newest first (descending), we need to calculate
        // the balance BEFORE this entry was applied
        let runningTotal = grant.amount
        
        const currentIndex = grant.vacations.findIndex(v => v.id === currentVacation.id)
        
        // Add all vacation amounts from the entries AFTER this one in the array
        // (which appear BELOW this one in the table - chronologically older)
        // Only include approved vacations (state 1) and sick leave (state 3)
        for (let i = currentIndex + 1; i < grant.vacations.length; i++) {
            if ([1, 3].includes(grant.vacations[i].state)) {
                runningTotal += grant.vacations[i].amount
            }
        }
        
        return runningTotal
    }

    getRemainingHoursAt(grant: VacationGrant, currentVacation: Vacation): number {
        // Calculate remaining hours after this vacation entry
        const balanceBefore = this.getVacationChartDx(grant, currentVacation)
        const deltaToApply = [1, 3].includes(currentVacation.state) ? currentVacation.amount : 0
        return balanceBefore + deltaToApply
    }
}
