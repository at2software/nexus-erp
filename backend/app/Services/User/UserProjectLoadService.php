<?php

namespace App\Services\User;

use App\Models\Assignment;
use App\Models\Company;
use App\Models\Param;
use App\Models\User;
use App\Services\UserTimelineService;

class UserProjectLoadService {
    public function build(User $user): mixed {
        $meId      = Param::get('ME_ID')->value;
        $meCompany = Company::find($meId);

        // auto-assign own company as service company (so orga is shown in timetracker)
        if ($meCompany && ! $user->assigned_companies()->where('companies.id', $meId)->exists()) {
            $meCompany->addAssignee($user);
        }

        // computation
        $ae = $user->activeEmployment;
        if (! $ae) {
            return response('user has no active employment', 404);
        }

        $activeSubscriptions = collect([...$user->activeProjects()->with('company')->get(), ...$user->assigned_companies()->get()])->unique();

        // Load avg_hpd accessor for each subscription's assignment
        $activeSubscriptions->each(function ($subscription) {
            if ($subscription->pivot && $subscription->pivot->id) {
                $assignment = Assignment::find($subscription->pivot->id);
                if ($assignment) {
                    $subscription->pivot->avg_hpd = $assignment->avg_hpd;
                }
            }
        });

        $weeklySubscriptions  = $activeSubscriptions->filter(fn ($_) => $_->pivot->hours_weekly > 0);
        $plannedSubscriptions = $activeSubscriptions->filter(fn ($_) => $_->pivot->hours_planned > 0);
        $weeklyHpw            = $weeklySubscriptions->reduce(fn ($a, $b) => $a + $b->pivot->hours_weekly, 0);
        $remainingHpw         = $ae->hpw - $weeklyHpw;

        // Generate leaves independently of subscriptions
        $timelineService = new UserTimelineService;
        $timelineLeaves  = $timelineService->generate($user, null, 40, true);

        if ($remainingHpw > 0) {
            $timeline        = $timelineService->generate($user, $plannedSubscriptions, $remainingHpw);
            $timelinePlanned = array_values(array_filter($timeline, fn ($_) => $_['type'] == 'Project' || $_['type'] == 'Company'));
        } else {
            $timelinePlanned = [];
        }

        return [
            'user'             => $user,
            'hpw'              => $ae->hpw,
            'remaining_hpw'    => $remainingHpw,
            'subscriptions'    => $activeSubscriptions,
            'weekly_ids'       => $weeklySubscriptions->map(fn ($_) => ['type' => $_->class, 'id' => $_->id])->values(),
            'timeline_planned' => $timelinePlanned,
            'timeline_leaves'  => $timelineLeaves,
        ];
    }
}
