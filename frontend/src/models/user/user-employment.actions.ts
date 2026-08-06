import { NxAction } from '@models/_core/nx.actions';
import { UserEmployment } from './user-employment.model';
import { nx } from '@models/_core/nx-bridge';

export function getUserEmploymentActions(self: UserEmployment): NxAction[] {
    return [{ title: 'Deactivate', on: () => self.is_active, action: () => self.update({ is_active: false }).subscribe(), roles: 'hr' }, { title: 'Activate', on: () => !self.is_active, action: () => self.update({ is_active: true }).subscribe(), roles: 'hr' }, nx().deleteAction(self, 'Really delete this employment?', { roles: 'hr' })];
}
