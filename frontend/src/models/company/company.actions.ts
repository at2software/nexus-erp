import { NxAction, NxActionType } from '@app/nx/nx.actions';
import { Company } from './company.model';
import { NxGlobal } from '@app/nx/nx.global';

export function getCompanyActions(self: Company): NxAction[] {
    return [
        { title: $localize`:@@i18n.common.open:open`, action: () => self.navigateTo(self.frontendUrl()) },
        ...NxGlobal.clipboardActions(self),
        { title: $localize`:@@i18n.common.edit:edit`, action: () => self.navigateTo(`/customers/${self.id}/staff`) },
        NxGlobal.deleteAction(self, 'Really delete this company?', { roles: 'admin' }),
        {
            title: $localize`:@@i18n.common.setDeprecated:set deprecated`,
            on: () => !self.is_deprecated,
            group: true,
            type: NxActionType.Destructive,
            action: () => self.update({ is_deprecated: true }),
            roles: 'admin',
        },
        ...self.markerActions(),
    ];
}
