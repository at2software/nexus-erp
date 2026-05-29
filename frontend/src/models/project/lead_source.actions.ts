import { NxAction, NxActionType } from '@app/nx/nx.actions';
import { LeadSource } from './lead_source.model';

export function getLeadSourceActions(self: LeadSource): NxAction[] {
    return [
        {
            title: $localize`:@@i18n.common.delete:delete`,
            action: () => self.modalConfirm().then(() => self.delete().subscribe()),
            group: true,
            type: NxActionType.Destructive,
            hotkey: 'CTRL+DELETE',
            roles: 'admin',
        },
    ];
}
