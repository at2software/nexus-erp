export interface IHasExtIssue {
    ext_issue_plugin_link_id?: string;
    ext_issue_id?: string;
}

/** Resolves the effective tracker link + issue id for a model, optionally falling back to a related model's link. */
export function effectiveExtIssueOf(self: IHasExtIssue, fallback?: IHasExtIssue): { linkId: string; issueId: string } | undefined {
    const linkId = self.ext_issue_plugin_link_id ?? fallback?.ext_issue_plugin_link_id;
    const issueId = self.ext_issue_id ?? fallback?.ext_issue_id;
    return linkId && issueId ? { linkId: String(linkId), issueId: String(issueId) } : undefined;
}
