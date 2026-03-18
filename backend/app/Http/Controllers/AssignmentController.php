<?php

namespace App\Http\Controllers;

use App\Enums\CommentType;
use App\Models\Assignment;
use App\Models\Comment;
use App\Models\Project;
use App\Models\User;
use App\Traits\ControllerHasPermissionsTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class AssignmentController extends Controller {
    use ControllerHasPermissionsTrait;

    public function destroy(Request $request, int $id) {
        $assignment = Assignment::with('assignee')->find($id);
        if ($assignment->links(Project::class, User::class)) {
            \App\Jobs\ChatRemoveUsersJob::dispatch($assignment->parent, [$assignment->assignee->id]);
        }
        return Assignment::destroy([$id]);
    }
    public function update(Request $request, int $id) {
        $assignment = Assignment::with('assignee', 'parent')->find($id);

        // Check if hours_planned is being updated and user has permission
        if ($request->has('hours_planned') && ! $this->canChangeHoursPlanned($assignment->parent)) {
            abort(403, 'You do not have permission to allocate time for this assignment.');
        }

        // Store old value for comment creation
        $oldHoursPlanned = $assignment->hours_planned ?? 0;

        $assignment->applyAndSave($request);

        // Create comment if hours_planned changed
        if ($request->has('hours_planned') && $oldHoursPlanned != $assignment->hours_planned) {
            $this->createAllocatedTimeComment($assignment, $oldHoursPlanned, $assignment->hours_planned);
        }
        return $assignment;
    }
    private function canChangeHoursPlanned($parent) {
        if (! $parent->has_time_budget) {
            return true;
        }
        return request()->user()->hasAnyRole(['hr', 'project_manager']);
    }
    private function createAllocatedTimeComment(Assignment $assignment, float $oldTime, float $newTime) {
        $user               = request()->user();
        $difference         = $newTime - $oldTime;
        $sign               = $difference > 0 ? 'added' : 'removed';
        $absoluteDifference = abs($difference);

        $assigneeName = $assignment->assignee ? $assignment->assignee->name : 'Unknown';

        $text = "{$sign} {$absoluteDifference} hours for {$assigneeName}";

        Comment::create([
            'text'        => $text,
            'type'        => CommentType::Info,
            'is_mini'     => true,
            'user_id'     => $user->id,
            ...$assignment->parent->toPoly(),
        ]);
    }
}
