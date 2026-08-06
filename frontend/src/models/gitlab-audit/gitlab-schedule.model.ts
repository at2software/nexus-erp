import { NxAction, NxActionType } from '@models/_core/nx.actions';
import { Serializable } from '@models/_core/serializable';

export class GitlabSchedule extends Serializable {
    static API_PATH = () => 'gitlab-audit';

    
    description!: string;
    ref!: string;
    cron!: string;
    active!: boolean;
    next_run_at!: string;

    class = 'GitlabSchedule';

    protected override buildActions(): NxAction[] {
        return [
            {
                title: 'delete',
                doubleClick: true,
                type: NxActionType.Destructive,
                action: (s) => this.var.onDelete?.(this, s),
            },
        ];
    }

    var: any = {};
}
