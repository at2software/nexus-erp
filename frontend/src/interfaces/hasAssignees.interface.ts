import { Assignee } from "@models/assignee/assignee.model";

export interface IHasAssignees {
    assignees: Assignee[];
    getAssignedUsers(): Assignee[];
}