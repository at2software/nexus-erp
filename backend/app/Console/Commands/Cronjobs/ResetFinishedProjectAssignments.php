<?php

namespace App\Console\Commands\Cronjobs;

use App\Helpers\NLog;
use App\Models\Assignment;
use App\Models\Project;
use App\Models\ProjectState;
use App\Models\User;
use Illuminate\Console\Command;

class ResetFinishedProjectAssignments extends Command {
    protected $signature   = 'assignments:reset-finished-projects';
    protected $description = 'Reset hours_weekly to 0 for assignments on finished projects';

    public function handle() {
        $this->info('Checking for assignments on finished projects...');

        // Get all assignments with hours_weekly > 0 for projects
        $assignments = Assignment::where('assignee_type', User::class)
            ->where('parent_type', Project::class)
            ->where('hours_weekly', '>', 0)
            ->with(['parent.states'])
            ->get();

        $resetCount = 0;

        foreach ($assignments as $assignment) {
            $project = $assignment->parent;

            // Check if project exists and has a finished state
            if ($project && $project->state && $project->state->progress == ProjectState::Finished) {
                $oldHours                 = $assignment->hours_weekly;
                $assignment->hours_weekly = 0;
                $assignment->save();

                $resetCount++;

                NLog::info("Reset assignment #{$assignment->id} for project '{$project->name}' (ID: {$project->id}) from {$oldHours}h/week to 0h/week");
                $this->info("  ✓ Reset assignment #{$assignment->id} for project '{$project->name}' from {$oldHours}h to 0h");
            }
        }

        if ($resetCount > 0) {
            $this->info("✓ Reset {$resetCount} assignment(s) on finished projects");
            NLog::info("ResetFinishedProjectAssignments: Reset {$resetCount} assignments");
        } else {
            $this->info('No assignments to reset');
        }

        return Command::SUCCESS;
    }
}
