<?php

namespace App\Queries;

use App\Models\Project;
use App\Models\User;
use App\Models\UserPaidTime;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class TimeBasedEmploymentQuery {
    public function getInfo(User $user): ?array {
        if (! $user->activeEmployment || ! $user->activeEmployment->is_time_based) {
            return null;
        }

        $projects = [];
        $orga     = 0;
        $query    = $user->foci();
        $query->select('project_id', 'company_id', 'user_id', DB::raw('sum(duration) as duration'));
        $query->whereDate('started_at', '>', $user->activeEmployment->started_at);
        if ($user->activeEmployment->ended_at) {
            $query->whereDate('ended_at', '<', $user->activeEmployment->ended_at);
        }
        $query->groupBy(['project_id', 'user_id', 'company_id']);

        foreach ($query->get() as $focus) {
            if ($parent = $focus->parent) {
                $parent           = json_decode(json_encode($parent));
                $parent->duration = $focus->duration;
                $projects[]       = $parent;
            } else {
                $orga += $focus->duration;
            }
        }

        $user->duration = $orga;
        $projects[]     = json_decode(json_encode($user));
        usort($projects, fn ($a, $b) => $b->duration - $a->duration);
        return $projects;
    }
    public function getTable(User $user): ?array {
        if (! $user->activeEmployment || ! $user->activeEmployment->is_time_based) {
            return null;
        }

        $query = $user->foci();
        $query->select('project_id', DB::raw("DATE_FORMAT(started_at, '%Y-%m') AS month"), DB::raw('sum(duration) as duration'));
        $query->whereDate('started_at', '>', $user->activeEmployment->started_at);
        if ($user->activeEmployment->ended_at) {
            $query->whereDate('ended_at', '<', $user->activeEmployment->ended_at);
        }
        $query->groupBy('project_id', 'month');

        $times = [];
        foreach ($query->get() as $focusData) {
            if (! isset($times[$focusData->month])) {
                $times[$focusData->month] = ['month' => $focusData->month, 'duration' => 0, 'type' => 0, 'excluded' => 0];
            }
            if ($focusData->project_id && ($project = Project::find($focusData->project_id)) && $project->exclude_from_tbe) {
                $times[$focusData->month]['excluded'] += $focusData->duration;
            } else {
                $times[$focusData->month]['duration'] += $focusData->duration;
            }
        }
        $times = array_values($times);

        $paidQuery = $user->timePayments();
        $paidQuery->whereDate('paid_at', '>', $user->activeEmployment->started_at);
        if ($user->activeEmployment->ended_at) {
            $paidQuery->whereDate('paid_at', '<', $user->activeEmployment->ended_at);
        }
        $paidQuery->oldest('paid_at');

        $paid = $paidQuery->get()->map(fn (UserPaidTime $payment) => [
            'type'               => 1,
            'month'              => Carbon::parse($payment->paid_at)->format('Y-m'),
            'raw'                => $payment->raw,
            'vacation'           => $payment->vacation,
            'description'        => $payment->description,
            'granted_by_user_id' => $payment->granted_by_user_id,
        ]);

        $data = array_merge($times, $paid->all());
        usort($data, fn ($a, $b) => strcmp($a['month'], $b['month']));
        return $data;
    }
}
