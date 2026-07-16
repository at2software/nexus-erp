import { NxAction } from '@app/nx/nx.actions';
import { Focus } from './focus.model';
import { ModalBaseService } from '@app/_modals/modal-base-service';
import { ModalEditFocusComponent } from '@app/_modals/modal-edit-focus/modal-edit-focus.component';
import { ModalLinkExtIssueComponent, ExtIssueLinkResult } from '@app/_modals/modal-link-ext-issue/modal-link-ext-issue.component';
import { NxGlobal } from '@app/nx/nx.global';

export function getFocusActions(self: Focus): NxAction[] {
    return [
        {
            title: $localize`:@@i18n.common.edit:edit`,
            action: () => ModalBaseService.open(ModalEditFocusComponent, self),
        },
        ...NxGlobal.clipboardActions(self),
        {
            // Opens the picker once; the chosen issue is applied to every selected focus.
            title: $localize`:@@i18n.issues.linkExternalIssue:link external issue`,
            group: true,
            interrupt: { service: ModalLinkExtIssueComponent, args: self },
            action: (_resolve, _ctx, result: ExtIssueLinkResult | undefined) =>
                result ? self.update({ ext_issue_plugin_link_id: result.ext_issue_plugin_link_id, ext_issue_id: result.ext_issue_id }) : undefined,
        },
        { title: $localize`:@@i18n.foci.resetToOrga:reset to organisational`, action: () => self.update({ project_id: null }).subscribe(), roles: 'hr' },
        {
            title: $localize`:@@i18n.foci.enableInvoicing:enable invoicing`,
            on: () => !self.invoice_item_id && self.is_unpaid,
            action: () => self.update({ is_unpaid: false }).subscribe(),
            group: true,
            roles: 'project_manager|financial',
        },
        {
            title: $localize`:@@i18n.foci.disableInvoicing:disable invoicing`,
            on: () => !self.invoice_item_id && !self.is_unpaid,
            action: () => self.update({ is_unpaid: true }).subscribe(),
            group: true,
            roles: 'project_manager|financial',
        },
        {
            title: $localize`:@@i18n.common.selectAll:select all...`,
            children: [
                {
                    title: $localize`:@@i18n.common.ofComment:...of comment`,
                    unselectsingleActionResolved: false,
                    hotkey: 'CTRL+C',
                    action: () =>
                        self.nxSelect(
                            (_: Focus) =>
                                (_.comment ?? '')
                                    .trim()
                                    .toLowerCase()
                                    .localeCompare((self.comment ?? '').trim().toLowerCase()) == 0,
                        ),
                },
            ],
        },
        ...self.markerActions(),
        {
            title: 'Assign',
            group: true,
            on: () => !!(NxGlobal.global.userFor(self.user_id)?.latest_foci?.length),
            children: () => {
                const user = NxGlobal.global.userFor(self.user_id);
                return (user?.latest_foci ?? []).map((_: any) => ({
                    title: _.parent_name,
                    group: true,
                    action: () => self.update({ parent_path: _.parent_path }).subscribe(),
                }));
            },
        },
        NxGlobal.deleteAction(self, $localize`:@@i18n.common.reallyDeleteThisFocus:really delete this focus?`, { roles: 'admin' }),
    ];
}
