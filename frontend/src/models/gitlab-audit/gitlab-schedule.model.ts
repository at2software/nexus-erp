import { NxAction, NxActionType } from '@app/nx/nx.actions';
import { INxContextMenu } from '@app/nx/nx.contextmenu.interface';
import { NxContextMenu } from '@app/nx/nx.contextmenu';

export class GitlabSchedule implements INxContextMenu {
    id!: number;
    description!: string;
    ref!: string;
    cron!: string;
    active!: boolean;
    next_run_at!: string;

    doubleClickAction = 0;
    class = 'GitlabSchedule';
    track_id = NxContextMenu.getTrackId();

    actions: NxAction[] = [
        {
            title: 'delete',
            type: NxActionType.Destructive,
            action: (s) => this.var.onDelete?.(this, s),
        },
    ];

    var: any = {};

    static fromApi(data: any): GitlabSchedule {
        return Object.assign(new GitlabSchedule(), data);
    }
}
