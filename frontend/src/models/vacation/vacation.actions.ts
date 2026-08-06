import { NxAction, NxActionType } from '@models/_core/nx.actions';
import { Vacation } from './vacation.model';
import { nx } from '@models/_core/nx-bridge';
import { MODAL } from '@models/_core/modal-registry';
import { ReviewDecision } from '@models/_core/modal-results';

export function getVacatisingleActionResolveds(self: Vacation): NxAction[] {
    return [
        {
            title: $localize`:@@i18n.common.review:review`,
            doubleClick: true,
            on: () => self.isOwnedByCurrentUser() || self.hasVacationPermissions(),
            interrupt: { service: MODAL.reviewVacation, args: self },
            action: (_resolve, _ctx, decision: ReviewDecision | undefined) => {
                switch (decision?.type) {
                    case 'approve':
                        return self.approve();
                    case 'decline':
                        return self.deny(decision.reason);
                    case 'withdraw':
                        return self.revoke();
                }
                return undefined;
            },
        },
        {
            title: $localize`:@@i18n.common.open:open`,
            on: () => self.state < Vacation.STATE_SICK,
            action: () => self.navigateTo(self.frontendUrl()!),
        },
        {
            title: $localize`:@@i18n.common.revoke:revoke`,
            group: true,
            on: () => (self.state === Vacation.STATE_REQUESTED || self.state === Vacation.STATE_APPROVED) && self.time_started().startOf('day').isAfter(new Date()),
            action: () => nx().service.put(`vacations/${self.id}/revoke`),
        },
        {
            title: $localize`:@@i18n.common.approve:approve`,
            group: true,
            on: () => self.state < Vacation.STATE_SICK && self.state == Vacation.STATE_REQUESTED,
            action: () => self.approve(),
        },
        {
            title: $localize`:@@i18n.common.reject:reject`,
            group: true,
            type: NxActionType.Destructive,
            on: () => self.state < Vacation.STATE_SICK && self.state == Vacation.STATE_REQUESTED,
            action: () => self.deny(),
        },
        {
            title: $localize`:@@i18n.common.acknowledge:acknowledge`,
            group: true,
            type: NxActionType.Destructive,
            on: () => self.state === Vacation.STATE_SICK && self.hasVacationPermissions(),
            action: () => self.acknowledge(),
        },
        nx().deleteAction(self, $localize`:@@i18n.vacation.reallyDeleteThisVacation:really delete this vacation?`, { roles: 'admin', on: () => self.state < Vacation.STATE_SICK }),
    ];
}
