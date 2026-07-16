import { NxAction, NxActionType } from '@app/nx/nx.actions';
import { NxContextMenu } from '@app/nx/nx.contextmenu';
import { Serializable } from '@models/serializable';
import { GitlabAuditService } from './gitlab-audit.service';

export class GitlabSchedule extends Serializable {
    static API_PATH = () => 'gitlab-audit';

    SERVICE = GitlabAuditService;
    
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
}
