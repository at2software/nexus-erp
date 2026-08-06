import { NxAction, NxActionType } from '@models/_core/nx.actions';
import { Connection } from './connection.model';

export function getConnectisingleActionResolveds(self: Connection): NxAction[] {
    return [
        {
            title: $localize`:@@i18n.customers.deleteConnection:delete connection`,
            doubleClick: true,
            action: () => self.modalConfirm().then(() => self.delete().subscribe()),
            type: NxActionType.Destructive,
            group: true,
            hotkey: 'CTRL+DELETE',
            roles: 'admin',
        },
    ];
}
