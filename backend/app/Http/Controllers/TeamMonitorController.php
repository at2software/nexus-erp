<?php

namespace App\Http\Controllers;

use App\Models\User;

class TeamMonitorController extends Controller {
    public function index() {
        $stats              = app(StatsController::class);
        $vacationController = app(VacationController::class);

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
            // Get user-specific holidays
            $holidays = array_map(fn ($_) => $_->datum, $vacationController->indexHolidays($user->work_zip));

            // Use User model method for focus display data
            $focusData          = $user->getFocusDisplayData();
            $user->focus_name   = $focusData['focus_name'];
            $user->focus_color  = $focusData['focus_color'];
            $user->availability = $focusData['availability'];
            $user->focus_icon   = $user->current_focus?->icon ?? null;

            // Use User model method for workload statistics
            $work                 = $stats->showWorkingTimeFor($user);
            $workloadStats        = $user->getWorkloadStats($work, $holidays);
            $user->workinfo       = $workloadStats['workinfo'];
            $user->average        = $workloadStats['average'];
            $user->averageClass   = $workloadStats['averageClass'];
            $user->required_hours = $user->getHpw();
        }

        $users       = $users->sort(fn ($a, $b) => $b->availability_status - $a->availability_status);
        $lastRefresh = now()->format('H:i:s');
        return view('team-monitor', compact('users', 'lastRefresh'));
    }
}
