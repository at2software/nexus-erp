import { Serializable } from '../serializable';
import { NxAction, NxActionType } from '@app/nx/nx.actions';
import { GitlabAuditService } from './gitlab-audit.service';
import { GitlabSchedule } from './gitlab-schedule.model';
import { Model } from '@constants/type-discriminators';
import { Type } from 'class-transformer';
import { Company } from '@models/company/company.model';

@Model('GitlabAuditProject')
export class GitlabAuditProject extends Serializable {
    static API_PATH = () => 'gitlab-audit';
    static DB_TABLE_NAME = () => 'gitlab_audit_projects';
    SERVICE = GitlabAuditService;

    gitlab_url!: string;
    namespace_with_path!: string;
    project_name!: string;
    gitlab_project_id?: number;
    company_id?: number;
    invoice_item_id?: number;
    @Type(() => Company) company?: Company;
    invoice_item?: any;
    schedules: GitlabSchedule[] = [];
    linked_projects: { id: number; name: string; has_chat: boolean }[] = [];

    actions: NxAction[] = [
        {
            title: 'rename',
            action: (s) => this.var.onRename?.(this, s),
        },
        {
            title: 'link with company',
            on: () => !this.company_id,
            action: (s) => this.var.onLinkCompany?.(this, s),
        },
        {
            title: 'unlink company',
            on: () => !!this.company_id,
            action: (s) => this.var.onUnlinkCompany?.(this, s),
        },
        {
            title: 'link with recurring invoice item',
            on: () => !!this.company_id && !this.invoice_item_id,
            action: (s) => this.var.onLinkInvoiceItem?.(this, s),
        },
        {
            title: 'unlink invoice item',
            on: () => !!this.invoice_item_id,
            action: (s) => this.var.onUnlinkInvoiceItem?.(this, s),
        },
        {
            title: 'create recurring invoice item',
            type: NxActionType.Creative,
            on: () => !!this.company_id && !this.invoice_item_id,
            action: (s) => this.var.onCreateInvoiceItem?.(this, s),
        },
    ];
}
