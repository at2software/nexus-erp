import { NxAction } from '@models/_core/nx.actions';
import { Cash } from './cash.model';
import { nx } from '@models/_core/nx-bridge';

export function getCashActions(self: Cash): NxAction[] {
    return [nx().deleteAction(self, $localize`:@@i18n.cash.reallyDeleteThisEntry:really delete this entry?`, { roles: 'financial' })];
}
