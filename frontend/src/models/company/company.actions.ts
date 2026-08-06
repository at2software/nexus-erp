import { NxAction, NxActionType } from '@models/_core/nx.actions';
import { Company } from './company.model';
import { nx } from '@models/_core/nx-bridge';

export function getCompanyActions(self: Company): NxAction[] {
    return [
        { title: $localize`:@@i18n.common.open:open`, doubleClick: true, action: () => self.navigateTo(self.frontendUrl()) },
        ...nx().clipboardActions(self),
        { title: $localize`:@@i18n.common.edit:edit`, action: () => self.navigateTo(`/customers/${self.id}/staff`) },
        nx().deleteAction(self, 'Really delete this company?', { roles: 'admin' }),
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
