<?php

namespace App\Console\Commands;

use App\Models\Focus;
use App\Models\Project;
use App\Models\ProjectState;
use Illuminate\Console\Command;

const AVG_WEEKS = 12;

class InsertAssignmentPercentages extends Command {
    protected $signature   = 'db:insert-assignment-percentages';
    protected $description = 'Command description';

    public function handle() {
        foreach (Project::with('assigned_users')->whereProgress(ProjectState::Running)->where('is_internal', false)->get() as $p) {
            $remaining = $p->work_estimated > 0 ? 1 - $p->hoursInvested / $p->work_estimated : 0;
            if ($remaining < 0) {
                $this->warn("overdue project budget $p->name [$p->id] (invested: $p->hoursInvested h / estimated $p->work_estimated)");
                $remaining = 0;
            }
            if ($p->is_time_based) {
                foreach ($p->assigned_users as $a) {
                    $avg = Focus::whereParent($p)
                        ->where('user_id', $a->id)
                        ->where('started_at', '>', now()->subWeeks(AVG_WEEKS))
                        ->sum('duration') / AVG_WEEKS;
                    $a->pivot->hours_weekly = round($avg, 2);
                    $a->pivot->save();
                }
            } else {
                if ($p->hoursInvested > 0 && $p->work_estimated > 0) {
                    foreach ($p->assigned_users as $a) {
                        $remaining = $p->work_estimated - $p->hoursInvested;
                        if ($remaining < 0) {
                            $remaining = 0;
                        }
                        $duration                = Focus::whereParent($p)->whereUserId($a->id)->sum('duration');
                        $perc                    = $duration / $p->hoursInvested;
                        $a->pivot->hours_planned = round($perc * $remaining, 2);
                        $a->pivot->save();
                    }
                }
            }
        }
    }
}
