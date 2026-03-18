import { NxAction, NxActionType } from "src/app/nx/nx.actions"
import { Comment } from "./comment.model"
import { ModalConfirmComponent } from "@app/_modals/modal-confirm/modal-confirm.component"

export function getCommentActions(self: Comment): NxAction[] {
    return [
        {
            title: $localize`:@@i18n.comment.setType:set type`, children: [
                { title: $localize`:@@i18n.comment.default:default`, action: () => self.update({ type: 0 }).subscribe() },
                { title: $localize`:@@i18n.common.info:info`, action: () => self.update({ type: 1 }).subscribe() },
                { title: $localize`:@@i18n.comment.warning:warning`, action: () => self.update({ type: 2 }).subscribe() },
                { title: $localize`:@@i18n.comment.notice:notice`, action: () => self.update({ type: 3 }).subscribe() },
            ]
        },
        {
            title: $localize`:@@i18n.common.delete:delete`,
            interrupt: { service: ModalConfirmComponent, args: { message: 'Really delete this comment?', title: 'Attention' } },
            action: () => self.delete(),
            type: NxActionType.Destructive,
            group: true,
            hotkey: 'CTRL+DELETE'
        },
    ]
}
