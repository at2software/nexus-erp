import { NxAction, NxActionType } from "src/app/nx/nx.actions"
import { File } from "./file.model"
import { NxGlobal } from "src/app/nx/nx.global"
import { FileService } from "./file.service"
import { ModalConfirmComponent } from "@app/_modals/modal-confirm/modal-confirm.component"

export function getFileActions(self: File): NxAction[] {
    return [
        { title: $localize`:@@i18n.common.download:download`, action: () => (NxGlobal.getService(FileService)! as FileService).show(self), group: true },
        {
            title: $localize`:@@i18n.common.delete:delete`,
            interrupt: { service: ModalConfirmComponent, args: { message: $localize`:@@i18n.invoices.reallyDeleteThisFile:really delete this file?`, title: $localize`:@@i18n.common.attention:attention` } },
            action: () => self.delete(),
            on: () => NxGlobal.global.user?.hasRole('admin') || false,
            type: NxActionType.Destructive,
            group: true,
            hotkey: 'CTRL+DELETE',
        },
    ]
}
