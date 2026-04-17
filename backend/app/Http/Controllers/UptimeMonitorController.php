<?php

namespace App\Http\Controllers;

use App\Models\UptimeMonitor;
use App\Models\User;
use App\Services\UptimeCheckService;
use App\Services\UptimeNotificationService;
use Carbon\Carbon;
use Illuminate\Http\Request;

class UptimeMonitorController extends Controller {
    public function index(Request $request) {
        $query = UptimeMonitor::query()
            ->when($request->has('is_active'), fn ($q) => $q->where('is_active', $request->boolean('is_active')))
            ->when($request->has('project_id'), fn ($q) => $q->whereHas('projects', fn ($pq) => $pq->where('projects.id', $request->project_id)))
            ->with(['projects', 'createdBy', 'recipients'])
            ->orderBy('name');
        return $query->get();
    }
    public function show(Request $request, UptimeMonitor $_) {
        $_->load(['projects', 'createdBy', 'recipients', 'latestCheck']);
        return $_;
    }
    public function store(Request $request) {
        $validated = $request->validate([
            'name'                    => 'required|string|max:255',
            'url'                     => 'required|url|max:512',
            'method'                  => 'sometimes|in:GET,POST,HEAD',
            'expected_status_code'    => 'sometimes|integer|min:100|max:599',
            'timeout'                 => 'sometimes|integer|min:5|max:120',
            'response_time_threshold' => 'sometimes|integer|min:100',
            'check_interval'          => 'sometimes|integer|min:60',
            'is_active'               => 'sometimes|boolean',
            'request_headers'         => 'sometimes|array',
            'request_body'            => 'sometimes|string|nullable',
            'project_ids'             => 'sometimes|array',
            'project_ids.*'           => 'exists:projects,id',
            'recipient_ids'           => 'sometimes|array',
            'recipient_ids.*'         => 'exists:users,id',
        ]);

        $validated['created_by_user_id'] = $request->user()->id;

        $monitor = UptimeMonitor::create($validated);

        if (isset($validated['project_ids'])) {
            $monitor->projects()->sync($validated['project_ids']);
        }

        if (isset($validated['recipient_ids'])) {
            $monitor->recipients()->sync($validated['recipient_ids']);
        }
        return $monitor->load(['projects', 'createdBy', 'recipients']);
    }
    public function update(Request $request, UptimeMonitor $_) {
        $validated = $request->validate([
            'name'                    => 'sometimes|string|max:255',
            'url'                     => 'sometimes|url|max:512',
            'method'                  => 'sometimes|in:GET,POST,HEAD',
            'expected_status_code'    => 'sometimes|integer|min:100|max:599',
            'timeout'                 => 'sometimes|integer|min:5|max:120',
            'response_time_threshold' => 'sometimes|integer|min:100',
            'check_interval'          => 'sometimes|integer|min:60',
            'is_active'               => 'sometimes|boolean',
            'request_headers'         => 'sometimes|array|nullable',
            'request_body'            => 'sometimes|string|nullable',
            'project_ids'             => 'sometimes|array',
            'project_ids.*'           => 'exists:projects,id',
            'recipient_ids'           => 'sometimes|array',
            'recipient_ids.*'         => 'exists:users,id',
        ]);

        $_->update($validated);

        if (isset($validated['project_ids'])) {
            $_->projects()->sync($validated['project_ids']);
        }

        if (isset($validated['recipient_ids'])) {
            $_->recipients()->sync($validated['recipient_ids']);
        }
        return $_->load(['projects', 'createdBy', 'recipients']);
    }
    public function destroy(UptimeMonitor $_) {
        $_->delete();
        return response()->json(['success' => true]);
    }
    public function indexChecks(Request $request, UptimeMonitor $_) {
        $days      = $request->get('days', 30);
        $sinceDate = Carbon::now()->subDays($days);
        return $_->checks()->dailyStats($sinceDate)->get();
    }
    public function indexRecipients(Request $request, UptimeMonitor $_) {
        return $_->recipients()
            ->withPivot(['notify_via_email', 'notify_via_chat', 'notify_on_recovery'])
            ->get();
    }
    public function updateRecipient(Request $request, UptimeMonitor $_, User $user) {
        $validated = $request->validate([
            'notify_via_email'   => 'required|boolean',
            'notify_via_chat'    => 'required|boolean',
            'notify_on_recovery' => 'required|boolean',
        ]);

        $_->recipients()->syncWithoutDetaching([
            $user->id => $validated,
        ]);
        return response()->json(['success' => true]);
    }
    public function testCheck(Request $request, UptimeMonitor $_, UptimeCheckService $checkService, UptimeNotificationService $notificationService) {
        try {
            $check = $checkService->performCheck($_);

            if ($request->boolean('with_notification') && $checkService->shouldNotify($_, $check)) {
                $notificationService->notifyDown($_, $check);
            }
            return response()->json([
                'success' => true,
                'check'   => $check,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error'   => $e->getMessage(),
            ], 500);
        }
    }
    public function stats(UptimeMonitor $_) {
        $totalChecks    = $_->checks()->count();
        $upChecks       = $_->checks()->where('status', 'up')->count();
        $downChecks     = $_->checks()->where('status', 'down')->count();
        $degradedChecks = $_->checks()->where('status', 'degraded')->count();

        $uptimePercentage = $totalChecks > 0 ? round(($upChecks / $totalChecks) * 100, 2) : 100.0;

        $avgResponseTime = $_->checks()
            ->where('status', 'up')
            ->whereNotNull('response_time')
            ->avg('response_time');

        $last24Hours = $_->checks()
            ->where('checked_at', '>=', Carbon::now()->subHours(24))
            ->get();

        $uptime24h = $last24Hours->count() > 0
            ? round(($last24Hours->where('status', 'up')->count() / $last24Hours->count()) * 100, 2)
            : 100.0;
        return response()->json([
            'total_checks'      => $totalChecks,
            'up_checks'         => $upChecks,
            'down_checks'       => $downChecks,
            'degraded_checks'   => $degradedChecks,
            'uptime_percentage' => $uptimePercentage,
            'uptime_24h'        => $uptime24h,
            'avg_response_time' => $avgResponseTime ? round($avgResponseTime) : null,
        ]);
    }
}
