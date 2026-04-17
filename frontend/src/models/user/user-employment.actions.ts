import { NxAction } from "src/app/nx/nx.actions"
import { UserEmployment } from "./user-employment.model"
import { NxGlobal } from "src/app/nx/nx.global"

export function getUserEmploymentActions(self: UserEmployment): NxAction[] {
    return [
        { title: 'Deactivate', on: () => self.is_active, action: () => self.update({ is_active: false }).subscribe(), roles: 'hr' },
        { title: 'Activate', on: () => !self.is_active, action: () => self.update({ is_active: true }).subscribe(), roles: 'hr' },
        NxGlobal.deleteAction(self, 'Really delete this employment?', { roles: 'hr' }),
    ]
}
