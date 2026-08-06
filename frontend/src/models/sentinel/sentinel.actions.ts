import { NxAction, NxActionType } from '@models/_core/nx.actions';
import { Sentinel } from './sentinel.model';

export function getSentinelActions(self: Sentinel): NxAction[] {
    return [
        {
            title: $localize`:@@i18n.settings.deleteSentinel:delete sentinel`,
            doubleClick: true,
            action: () => self.modalConfirm().then(() => self.delete().subscribe()),
            type: NxActionType.Destructive,
            group: true,
            hotkey: 'CTRL+DELETE',
            roles: 'admin',
        },
    ];
}
