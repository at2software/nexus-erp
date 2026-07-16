import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgbTooltipModule } from '@ng-bootstrap/ng-bootstrap';
import { ModalBaseComponent } from '@app/_modals/modal-base.component';
import { HotkeyDirective } from '@directives/hotkey.directive';
import { Vacation } from '@models/vacation/vacation.model';
import { VacationGrant } from '@models/vacation/vacation-grant.model';
import { VacationGrantService } from '@models/vacation/vacation-grant.service';

export type ReviewDecision = { type: 'approve' } | { type: 'decline'; reason: string } | { type: 'withdraw' };

@Component({
    selector: 'modal-review-vacation',
    templateUrl: './modal-review-vacation.component.html',
    styleUrls: ['./modal-review-vacation.component.scss'],
    imports: [FormsModule, DatePipe, DecimalPipe, NgbTooltipModule, HotkeyDirective],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ModalReviewVacationComponent extends ModalBaseComponent<ReviewDecision> {
    vacation!: Vacation;
    grant = signal<VacationGrant | undefined>(undefined);
    isOwner = signal(false);
    isHR = signal(false);
    showDeclineReason = signal(false);
    declineReason = '';

    #grantService = inject(VacationGrantService);
    #destroyRef = inject(DestroyRef);
    #decision?: ReviewDecision;

    init(vacation: Vacation): void {
        this.vacation = vacation;
        this.isOwner.set(vacation.isOwnedByCurrentUser());
        this.isHR.set(vacation.hasVacationPermissions());
        // Double-click triggers the action without evaluating its `on` guard, so re-check access here.
        if (!this.isOwner() && !this.isHR()) {
            this.decline();
            return;
        }
        if (vacation.vacation_grant_id) {
            this.#grantService
                .show(vacation.vacation_grant_id)
                .pipe(takeUntilDestroyed(this.#destroyRef))
                .subscribe((grant) => this.grant.set(grant));
        }
    }

    isOpen = () => this.vacation.state === Vacation.STATE_REQUESTED;
    canWithdraw = () => this.isOpen() && this.isOwner();
    // HR can approve/reject any open request, including their own (they keep withdraw too).
    canDecide = () => this.isOpen() && this.isHR();

    // Vacation amounts are stored as negative deductions; display them as positive durations.
    absHours = () => Math.abs(this.vacation.amount);
    absDays = () => this.absHours() / (this.vacation.user?.getAverageHpd() ?? 0);
    remainingAfterApproval = () => (this.grant()?.remainingHours() ?? 0) + this.vacation.amount;

    onApprove() {
        this.#decision = { type: 'approve' };
        this.accept();
    }

    onDecline() {
        if (!this.showDeclineReason()) {
            this.showDeclineReason.set(true);
            return;
        }
        if (!this.declineReason.trim()) return;
        this.#decision = { type: 'decline', reason: this.declineReason.trim() };
        this.accept();
    }

    onWithdraw() {
        this.#decision = { type: 'withdraw' };
        this.accept();
    }

    onSuccess(): ReviewDecision {
        return this.#decision!;
    }
}
