<?php

namespace App\Http\Controllers;

use App\Models\GitlabAuditProject;
use App\Models\PluginLink;
use App\Models\Project;
use Illuminate\Http\Request;

class GitlabAuditController extends Controller {
    public function index() {
        $auditProjects = GitlabAuditProject::with('company', 'invoiceItem')->get();
        foreach ($auditProjects as $ap) {
            $ap->linked_projects = $this->linkedProjects($ap);
        }
        return $auditProjects;
    }
    private function linkedProjects(GitlabAuditProject $ap): array {
        if (! $ap->gitlab_project_id) {
            return [];
        }
        $gitUrl = $ap->gitlab_url.'projects/'.$ap->gitlab_project_id;
        return PluginLink::where('type', 'git')
            ->where('url', $gitUrl)
            ->where('parent_type', Project::class)
            ->get()
            ->map(function ($link) {
                $project = Project::find($link->parent_id);
                if (! $project) {
                    return null;
                }
                $hasChat = $project->pluginLinks()
                    ->whereIn('type', ['mattermost', 'slack'])
                    ->exists();
                return [
                    'id'       => $project->id,
                    'name'     => $project->name,
                    'has_chat' => $hasChat,
                ];
            })
            ->filter()
            ->values()
            ->toArray();
    }
    public function store(Request $request) {
        $data = $request->validate([
            'gitlab_url'          => 'required|string',
            'namespace_with_path' => 'required|string',
            'project_name'        => 'required|string',
            'gitlab_project_id'   => 'nullable|integer',
            'company_id'          => 'nullable|exists:companies,id',
            'invoice_item_id'     => 'nullable|exists:invoice_items,id',
        ]);
        return GitlabAuditProject::updateOrCreate(
            ['gitlab_url' => $data['gitlab_url'], 'namespace_with_path' => $data['namespace_with_path']],
            $data
        );
    }
    public function update(Request $request, GitlabAuditProject $gitlabAuditProject) {
        $data = $request->validate([
            'project_name'    => 'sometimes|string',
            'company_id'      => 'nullable|exists:companies,id',
            'invoice_item_id' => 'nullable|exists:invoice_items,id',
        ]);
        $gitlabAuditProject->update($data);
        return $gitlabAuditProject->load('company', 'invoiceItem');
    }
    public function destroy(GitlabAuditProject $gitlabAuditProject) {
        $gitlabAuditProject->delete();
        return response()->noContent();
    }
}
