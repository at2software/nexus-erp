import { NxAction } from "src/app/nx/nx.actions"
import { File } from "./file.model"
import { NxGlobal } from "src/app/nx/nx.global"
import { FileService } from "./file.service"

export function getFileActions(self: File): NxAction[] {
    return [
        { title: $localize`:@@i18n.common.download:download`, action: () => (NxGlobal.getService(FileService)! as FileService).show(self), group: true },
        NxGlobal.deleteAction(self, $localize`:@@i18n.invoices.reallyDeleteThisFile:really delete this file?`, { roles: 'admin' }),
    ]
}
