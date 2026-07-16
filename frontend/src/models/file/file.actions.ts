import { NxAction } from '@app/nx/nx.actions';
import { File } from './file.model';
import { NxGlobal } from '@app/nx/nx.global';
import { FileService } from './file.service';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { ModalFilePreviewComponent } from '@app/_modals/modal-file-preview/modal-file-preview.component';

const isPreviewable = (file: File): boolean => file.mime === 'application/pdf' || !!file.mime?.startsWith('image/');

export function getFileActions(self: File): NxAction[] {
    return [
        { title: $localize`:@@i18n.common.preview:preview`, action: () => ModalBaseService.open(ModalFilePreviewComponent, self), on: () => isPreviewable(self) },
        { title: $localize`:@@i18n.common.download:download`, action: () => (NxGlobal.getService(FileService)! as FileService).download(self), group: true },
        NxGlobal.deleteAction(self, $localize`:@@i18n.invoices.reallyDeleteThisFile:really delete this file?`, { roles: 'admin' }),
    ];
}
