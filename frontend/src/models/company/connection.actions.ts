import { NxAction, NxActionType } from "src/app/nx/nx.actions"
import { Connection } from "./connection.model"

export function getConnectisingleActionResolveds(self: Connection): NxAction[] {
    return [
        {
            title: $localize`:@@i18n.customers.deleteConnection:delete connection`,
            action: () => self.confirm().then(() => self.delete().subscribe()),
            type: NxActionType.Destructive,
            group: true,
            hotkey: 'CTRL+DELETE',
            roles: 'admin'
        },
    ]
}
