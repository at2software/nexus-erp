<?php

namespace App\Http\Controllers;

use App\Jobs\ChatRemoveUsersJob;
use App\Models\Assignment;
use App\Models\Project;
use App\Models\User;
use Illuminate\Http\Request;

class AssignmentController extends Controller {
    public function destroy(Assignment $assignment) {
        $assignment->load('assignee');
        if ($assignment->links(Project::class, User::class)) {
            ChatRemoveUsersJob::dispatch($assignment->parent, [$assignment->assignee->id]);
        }
        return $assignment->delete();
    }
    public function update(Request $request, int $id) {
        $assignment = Assignment::with('assignee', 'parent')->find($id);

        if ($request->has('hours_planned') && ! Assignment::canChangeHoursPlanned($assignment->parent)) {
            abort(403, 'You do not have permission to allocate time for this assignment.');
        }

        $oldHoursPlanned = $assignment->hours_planned ?? 0;

        $assignment->applyAndSave($request);

        if ($request->has('hours_planned') && $oldHoursPlanned != $assignment->hours_planned) {
            $assignment->createHoursChangeComment($oldHoursPlanned, $assignment->hours_planned);
        }
        return $assignment;
    }
}
