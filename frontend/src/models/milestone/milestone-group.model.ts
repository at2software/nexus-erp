import { InvoiceItem } from "@models/invoice/invoice-item.model";
import { Project } from "@models/project/project.model";
import { Serializable } from "@models/_core/serializable";
import { Task } from "@models/task/task.model";
import { Type } from '@models/_core/hydrate';
import { Milestone } from "./milestone.model";

export class MilestonesGroup extends Serializable {
    static API_PATH = (): string => 'milestones';
    @Type(() => Project) project!: Project;
    @Type(() => Milestone) milestones: Milestone[] = [];
    @Type(() => Task) project_tasks: Task[] = [];
}

export class MilestoneData extends Serializable {
    static API_PATH = (): string => 'milestones';
    @Type(() => Milestone) unassigned: Milestone[] = [];
    @Type(() => Milestone) overdue: Milestone[] = [];
    @Type(() => Milestone) noWorkload: Milestone[] = [];
    @Type(() => Project) projects: Project[] = [];
    @Type(() => InvoiceItem) invoiceItemsWithoutMilestone: InvoiceItem[] = [];
}