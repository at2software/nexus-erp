import { NxAction } from '@app/nx/nx.actions';
import { Comment } from './comment.model';
import { NxGlobal } from '@app/nx/nx.global';

export function getCommentActions(self: Comment): NxAction[] {
    const canEdit = () => self.isMyUser() || NxGlobal.global.user?.hasRole('admin') || false;
    return [
        {
            title: $localize`:@@i18n.comment.setType:set type`,
            on: canEdit,
            children: [
                { title: $localize`:@@i18n.comment.default:default`, action: () => self.update({ type: 0 }).subscribe() },
                { title: $localize`:@@i18n.common.info:info`, action: () => self.update({ type: 1 }).subscribe() },
                { title: $localize`:@@i18n.comment.warning:warning`, action: () => self.update({ type: 2 }).subscribe() },
                { title: $localize`:@@i18n.comment.notice:notice`, action: () => self.update({ type: 3 }).subscribe() },
            ],
        },
        { title: $localize`:@@i18n.comment.makeSticky:make sticky`, action: () => self.update({ is_sticky: true }).subscribe(), on: () => canEdit() && !self.is_sticky },
        { title: $localize`:@@i18n.comment.unstick:unstick`, action: () => self.update({ is_sticky: false }).subscribe(), on: () => canEdit() && self.is_sticky },
        NxGlobal.deleteAction(self, 'Really delete this comment?', { on: canEdit }),
    ];
}
