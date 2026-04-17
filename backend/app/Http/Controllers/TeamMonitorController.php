<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\WorkingTimeService;

class TeamMonitorController extends Controller {
    public function index() {
        // Force fresh database query with no caching
        $users = User::whereHas('activeEmployments')
            ->with(['current_focus', 'vacations', 'activeVacations', 'active_sick_notes'])
            ->get()
            ->each(function ($user) {
                // Force refresh of computed attributes by clearing cache
                $user->unsetRelation('current_focus');
                $user->unsetRelation('activeVacations');
                $user->unsetRelation('active_sick_notes');
            })
            ->load(['current_focus', 'activeVacations', 'active_sick_notes'])
            ->append(['availability_status', 'is_sick', 'is_on_vacation']);

        foreach ($users as &$user) {
            // Use User model method for focus display data
            $focusData          = $user->getFocusDisplayData();
            $user->focus_name   = $focusData['focus_name'];
            $user->focus_color  = $focusData['focus_color'];
            $user->availability = $focusData['availability'];
            $user->focus_icon   = $user->current_focus?->icon ?? null;

            $work                 = WorkingTimeService::getWorkingTimeFor($user);
            $user->workinfo       = $work['workinfo'];
            $user->average        = $work['average'];
            $user->averageClass   = $work['averageClass'];
            $user->required_hours = $work['required_hours'];
        }

        $users       = $users->sort(fn ($a, $b) => $b->availability_status - $a->availability_status);
        $lastRefresh = now()->format('H:i:s');
        return view('team-monitor', compact('users', 'lastRefresh'));
    }
}
