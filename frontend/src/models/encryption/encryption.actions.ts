import { NxAction } from '@app/nx/nx.actions';
import { Encryption } from './encryption.model';

export function getEncryptisingleActionResolveds(self: Encryption): NxAction[] {
    return [{ title: $localize`:@@i18n.common.delete:delete`, action: () => self.modalConfirm().then(() => self.delete().subscribe()), group: true, hotkey: 'CTRL+DELETE' }];
}
