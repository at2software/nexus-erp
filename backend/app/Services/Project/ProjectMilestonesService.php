<?php

namespace App\Services\Project;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Support\Facades\DB;

class ProjectMilestonesService {
    public function build(Project $project, int $currentUserId): array {
        $milestones = $project->milestones()->with(['dependants', 'dependees', 'tasks', 'invoiceItems'])->orderBy('position')->get();
        $milestones->each->append('children');

        // Load tasks assigned to current user for the project
        $projectTasks = Task::where('parent_type', 'App\\Models\\Project')
            ->where('parent_id', $project->id)
            ->whereExists(function ($query) use ($currentUserId) {
                $query->select(DB::raw(1))
                    ->from('assignments')
                    ->whereColumn('assignments.parent_id', 'tasks.id')
                    ->where('assignments.parent_type', 'App\\Models\\Task')
                    ->where('assignments.assignee_id', $currentUserId)
                    ->where('assignments.assignee_type', 'App\\Models\\User');
            })
            ->with('assignee.assignee')
            ->get();

        return [
            'project_tasks' => $projectTasks,
            'milestones'    => $milestones->values(),
        ];
    }
}
