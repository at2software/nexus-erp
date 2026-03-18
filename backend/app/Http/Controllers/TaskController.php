<?php

namespace App\Http\Controllers;

use App\Models\Project;
use App\Models\Task;
use Illuminate\Http\Request;

class TaskController extends Controller {
    public function store(Request $request) {
        $new = new Task($request->user()->toPoly());
        $new->applyAndSave($request, ['project_id', 'assignment_id', 'task_id', 'milestone_id']);
        return $new;
    }
    public function storeForProject(Request $request, Project $_) {
        $data = $request->validate([
            'name'        => 'required|string',
            'description' => 'nullable|string',
            'parent_type' => 'nullable|string',
            'parent_id'   => 'nullable|integer',
        ]);

        // Use provided parent or default to project
        if (isset($data['parent_type']) && isset($data['parent_id'])) {
            $task = Task::create($data);
        } else {
            $task = Task::create(array_merge($_->toPoly(), $data));
        }

        // Auto-assign to current user
        \App\Models\Assignment::create([
            'parent_type'   => 'App\\Models\\Task',
            'parent_id'     => $task->id,
            'assignee_type' => 'App\\Models\\User',
            'assignee_id'   => $request->user()->id,
        ]);
        return $task->load('assignee.assignee');
    }
    public function index(Request $request) {
        return $request->user()?->unfinishedTasks()->with('parent')->get() ?? [];
    }
    public function indexForProject(Request $request, Project $_) {
        return $_->unfinishedTasks;
    }
    public function destroy(Request $request, Project $_, Task $task) {
        return $task->delete();
    }
    public function update(Request $request, Project $_, Task $task) {
        return $task->applyAndSave($request);
    }
    public function assign(Request $request, Project $_, Task $task) {
        $body             = $this->getBody();
        $ass              = $_->assignees()->where('user_id', $body->user_id)->firstOrFail();
        $_->assignment_id = $ass->id;
        return $task;
    }
}
