<?php

namespace App\Traits;

use App\Http\Controllers\PluginChatController;
use App\Http\Controllers\PluginController;
use App\Http\Middleware\Auth;
use App\Models\Assignment;
use App\Models\CompanyContact;
use App\Models\Project;
use App\Models\User;
use Illuminate\Support\Facades\Log;

trait HasAssignmentsTrait {
    public function assignees() {
        return $this->hasManyMorph(Assignment::class)->with('assignee');
    }
    public function myAssignment() {
        return $this->assignees()->whereAssignee(Auth::user());
    }
    public function assigned_users() {
        return $this
            ->morphedByMany(User::class, 'assignee', 'assignments', 'parent_id')
            ->where('parent_type', Project::class);
    }
    public function assignedContacts() {
        return $this->morphedByMany(CompanyContact::class, 'assignee', 'assignments', 'parent_id');
    }
    public function addAssigneeFromRequest() {
        $request = request();
        $request->validate([
            'class' => 'required|in:user,company_contact',
            'id'    => 'required|numeric',
        ]);

        $newAssignment = null;
        if ($request->class === 'user') {
            $newAssignment = $this->addAssignee(User::find($request->id));
        } elseif ($request->class === 'company_contact') {
            $newAssignment = $this->addAssignee(CompanyContact::find($request->id));
        }

        if (! $newAssignment) {
            return null;
        }

        if ($newAssignment->links(Project::class, User::class)) {
            \App\Jobs\ChatAddUsersJob::dispatch($this, [$newAssignment->assignee->id]);
        }
        return $newAssignment;
    }
    public function addAssignee(User|CompanyContact $obj, $role = null) {
        if (Assignment::whereParentAndAssignee($this, $obj)->exists()) {
            return null;
        }

        $a = new Assignment;
        $a->parent()->associate($this);
        $a->assignee()->associate($obj);
        $a->flags = 0;

        if (! $role && is_a($obj, User::class)) {
            $a->role_id = $role ?: 1;
        } elseif (! $role && is_a($obj, CompanyContact::class)) {
            $a->role_id = $role ?: 3;
        } else {
            $a->role_id = 1;
        }

        $a->save();
        $a->load('assignee', 'parent');
        return $a;
    }
    public function setMainContactByAssignment(Assignment $assignment) {
        // Clear main contact flag from all assignments for this parent
        Assignment::where($this->toPoly())
            ->update(['flags' => \DB::raw('flags & ~'.Assignment::FLAG_MAIN_CONTACT)]);

        // Set main contact flag on specified assignment
        Assignment::where('id', $assignment->id)
            ->update(['flags' => \DB::raw('flags | '.Assignment::FLAG_MAIN_CONTACT)]);
        return $assignment;
    }
}
