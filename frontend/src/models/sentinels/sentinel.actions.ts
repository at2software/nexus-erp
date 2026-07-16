import { NxAction, NxActionType } from '@app/nx/nx.actions';
import { Sentinel } from './sentinel.model';

export function getSentinelActions(self: Sentinel): NxAction[] {
    return [
        {
            title: $localize`:@@i18n.settings.deleteSentinel:delete sentinel`,
            action: () => self.modalConfirm().then(() => self.delete().subscribe()),
            type: NxActionType.Destructive,
            group: true,
            hotkey: 'CTRL+DELETE',
            roles: 'admin',
        },
    ];
}
