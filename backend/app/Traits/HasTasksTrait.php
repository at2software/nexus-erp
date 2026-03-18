<?php

namespace App\Traits;

use App\Enums\TaskState;
use App\Models\Task;

trait HasTasksTrait {
    protected static function bootHasTasksTrait(): void {
        static::deleting(function ($_) {
            $_->tasks()->delete();
        });
    }
    public function tasks() {
        return $this->hasManyMorph(Task::class);
    }
    public function unfinishedTasks() {
        $baseQuery = $this->hasManyMorph(Task::class)
            ->whereState(TaskState::Open)
            ->whereNull('assignment_id');

        $userId = request()->user()?->id;
        if ($userId) {
            // Union with ALL open tasks assigned to current user (regardless of parent)
            return $baseQuery->union(
                Task::query()
                    ->whereState(TaskState::Open)
                    ->where('assignment_id', $userId)
            );
        }
        return $baseQuery;
    }
}
