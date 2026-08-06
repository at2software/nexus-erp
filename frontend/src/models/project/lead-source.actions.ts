import { NxAction, NxActionType } from '@models/_core/nx.actions';
import { LeadSource } from './lead-source.model';

export function getLeadSourceActions(self: LeadSource): NxAction[] {
    return [
        {
            title: $localize`:@@i18n.common.delete:delete`,
            doubleClick: true,
            action: () => self.modalConfirm().then(() => self.delete().subscribe()),
            group: true,
            type: NxActionType.Destructive,
            hotkey: 'CTRL+DELETE',
            roles: 'admin',
        },
    ];
}
