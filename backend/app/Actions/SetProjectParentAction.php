<?php

namespace App\Actions;

use App\Models\Assignment;
use App\Models\PluginLink;
use App\Models\Project;

class SetProjectParentAction {
    public function execute(Project $project, ?int $newParentId): void {
        $parent = null;

        $this->clearExistingRelations($project);

        if ($newParentId) {
            $parent = Project::findOrFail($newParentId);
            $this->copyAssignees($project, $parent);
            $this->copyPluginLinks($project, $parent);
        }

        $this->updateProjectAttributes($project, $parent);
    }
    private function clearExistingRelations(Project $project): void {
        if ($project->pluginLinks) {
            $project->pluginLinks->each(fn ($_) => $_->delete());
        }

        $project->assignees()->delete();
    }
    private function copyAssignees(Project $project, Project $parent): void {
        $assignees = $parent->assignees()->get();

        foreach ($assignees as $assignee) {
            Assignment::firstOrCreate([
                ...$project->toPoly(),
                ...$assignee->assignee->toPoly('assignee'),
                'role_id' => $assignee->role_id,
            ]);
        }
    }
    private function copyPluginLinks(Project $project, Project $parent): void {
        $parentLinks = $parent->pluginLinks()->get();

        if ($parentLinks) {
            foreach ($parentLinks as $link) {
                PluginLink::firstOrCreate([
                    'name' => $link->name,
                    'type' => $link->type,
                    'url'  => $link->url,
                    ...$project->toPoly(),
                ]);
            }
        }
    }
    private function updateProjectAttributes(Project $project, ?Project $parent): void {
        $project->project_manager_id = $parent?->project_manager_id ?? null;
        $project->product_id         = $parent?->product_id ?? null;
    }
}
