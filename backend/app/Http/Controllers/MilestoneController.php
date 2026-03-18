<?php

namespace App\Http\Controllers;

use App\Enums\MilestoneState;
use App\Helpers\NLog;
use App\Jobs\ChatSendMessageJob;
use App\Models\InvoiceItem;
use App\Models\Milestone;
use App\Models\Param;
use App\Models\Project;
use App\Traits\ControllerHasPermissionsTrait;
use Illuminate\Http\Request;

class MilestoneController extends Controller {
    use ControllerHasPermissionsTrait;

    public function indexOverview(Request $request) {
        // 1. Unassigned milestones (user_id is null) from running projects
        $unassigned = Milestone::whereNull('user_id')
            ->where('state', '!=', MilestoneState::DONE)
            ->whereHas('project', fn ($q) => $q->whereRunning())
            ->with(['project:id,name,company_id', 'project.company', 'project.assignees'])
            ->orderBy('due_at')
            ->get();

        // 2. Overdue milestones (started_at in the past but state is 0 = not started)
        $overdue = Milestone::where('state', MilestoneState::TODO)
            ->where('started_at', '<', now()->startOfDay())
            ->whereHas('project', fn ($q) => $q->whereRunning())
            ->with(['project:id,name,company_id', 'project.company', 'user'])
            ->orderBy('started_at')
            ->get();

        // 3. Milestones without workload (no invoice items AND no manual workload_hours)
        $noWorkload = Milestone::where('state', '!=', MilestoneState::DONE)
            ->where(function ($q) {
                $q->whereNull('workload_hours')->orWhere('workload_hours', 0);
            })
            ->whereDoesntHave('invoiceItems')
            ->whereHas('project', fn ($q) => $q->whereRunning())
            ->with(['project:id,name,company_id', 'project.company', 'user'])
            ->orderBy('due_at')
            ->get();

        // 4. Projects with workload deviation analysis (exclude time-based and internal projects)
        $projects = Project::whereRunning()
            ->where('is_time_based', false)
            ->where('company_id', '!=', Param::get('ME_ID')->value)
            ->with([
                'company',
                'milestones' => fn ($q) => $q->with('invoiceItems'),
            ])
            ->get()
            ->map(function ($project) {
                // Project estimated time (from invoice items)
                $estimatedHours = $project->work_estimated ?? 0;

                // Milestone workload hours (sum of workload_hours or computed from invoice items)
                $milestoneHours = $project->milestones->sum(function ($milestone) {
                    if ($milestone->workload_hours !== null && $milestone->workload_hours > 0) {
                        return $milestone->workload_hours;
                    }
                    return $milestone->invoiceItems->sum(fn ($item) => $item->assumedWorkload());
                });

                $deviation = $estimatedHours > 0
                    ? round((($milestoneHours - $estimatedHours) / $estimatedHours) * 100, 1)
                    : ($milestoneHours > 0 ? 100 : 0);

                return [
                    'id'               => $project->id,
                    'icon'             => $project->icon,
                    'name'             => $project->name,
                    'company_id'       => $project->company_id,
                    'company_name'     => $project->company->name ?? '',
                    'estimated_hours'  => round($estimatedHours, 1),
                    'milestone_hours'  => round($milestoneHours, 1),
                    'deviation'        => $deviation,
                    'milestone_count'  => $project->milestones->count(),
                    'missing_coverage' => $estimatedHours > 0 && $milestoneHours == 0,
                ];
            })
            ->sortByDesc(fn ($p) => abs($p['deviation']))
            ->values();

        return [
            'unassigned'  => $unassigned,
            'overdue'     => $overdue,
            'no_workload' => $noWorkload,
            'projects'    => $projects,
        ];
    }
    public function index(Request $request) {
        $userId   = $request->user()->id;
        $response = [
            'overdue'     => Milestone::where('user_id', $userId)->whereState(1)->with('project')->whereBefore('due_at', now())->get(),
            'needs_start' => Milestone::where('user_id', $userId)->whereState(0)->with('project')->whereBefore('started_at', now())->get(),
            'running'     => Milestone::where('user_id', $userId)->whereState(1)->with('project')->whereAfter('due_at', now())->get(),
        ];
        return $response;
    }
    public function linkInvoiceItem(Request $request, Milestone $milestone, InvoiceItem $invoiceItem) {
        // Check if the invoice item is already linked to another milestone
        if ($invoiceItem->milestones()->exists()) {
            return response()->json([
                'error'   => 'Invoice item is already tracked by another milestone',
                'message' => 'This invoice item is already linked to milestone(s): '.$invoiceItem->milestones->pluck('name')->join(', '),
            ], 422);
        }

        // Calculate duration and due date
        $estimatedHours = $invoiceItem->assumedWorkload();
        $hoursPerDay    = \App\Models\Param::get('INVOICE_HPD')->value;

        // Duration = raw estimated hours (without param factor)
        $duration = $estimatedHours;

        // Calculate estimated days
        $estimatedDays = ceil($estimatedHours / $hoursPerDay);

        // Calculate due_at if milestone doesn't have one: start date + estimated days
        $updateData = [];
        if (! $milestone->duration || $milestone->duration < $duration) {
            $updateData['duration'] = $duration;
        }

        if (! $milestone->due_at && $milestone->started_at) {
            $startDate            = \Carbon\Carbon::parse($milestone->started_at);
            $updateData['due_at'] = $startDate->addDays($estimatedDays)->toDateString();
        }

        if (! empty($updateData)) {
            $milestone->update($updateData);
        }

        // Attach the invoice item to the milestone
        $milestone->invoiceItems()->attach($invoiceItem->id);
        return response()->json([
            'message'            => 'Invoice item linked to milestone successfully',
            'milestone_id'       => $milestone->id,
            'invoice_item_id'    => $invoiceItem->id,
            'estimated_hours'    => $estimatedHours,
            'estimated_days'     => $estimatedDays,
            'hours_per_day_used' => $hoursPerDay,
            'milestone'          => $milestone->fresh(),
        ]);
    }
    public function unlinkInvoiceItem(Request $request, Milestone $milestone, InvoiceItem $invoiceItem) {
        // Detach the invoice item from the milestone
        $milestone->invoiceItems()->detach($invoiceItem->id);
        return response()->json([
            'message'         => 'Invoice item unlinked from milestone successfully',
            'milestone_id'    => $milestone->id,
            'invoice_item_id' => $invoiceItem->id,
        ]);
    }
    public function update(Request $request, Milestone $milestone) {
        $data = $request->validate([
            'name'           => 'string|nullable',
            'comments'       => 'string|nullable',
            'started_at'     => 'date|nullable',
            'due_at'         => 'date|nullable',
            'duration'       => 'integer|min:0|nullable',
            'progress'       => 'numeric|min:0|max:100|nullable',
            'state'          => 'integer|nullable',
            'position'       => 'integer|nullable',
            'user_id'        => 'integer|exists:users,id|nullable',
            'depends_on'     => 'nullable|integer|exists:milestones,id',
            'workload_hours' => 'numeric|min:0|nullable',
        ]);

        // Handle depends_on separately
        if ($request->has('depends_on')) {
            if ($request->depends_on === null) {
                // Remove all dependencies
                $milestone->dependees()->detach();
            } else {
                // Sync to single dependency
                $milestone->dependees()->sync([$request->depends_on]);
            }
            unset($data['depends_on']);
        }

        $oldState = $milestone->state;
        $milestone->update($data);

        if (array_key_exists('state', $data) && $oldState !== $milestone->state) {
            $pm = $milestone->project->projectManager;
            if ($pm && $pm->id !== $request->user()->id) {
                $props = [
                    'from_webhook'         => 'true',
                    'webhook_display_name' => $milestone->user->name ?? 'NEXUS',
                    'override_username'    => $milestone->user->name ?? 'NEXUS',
                    'override_icon_url'    => env('API_URL') . ($milestone->user->icon ?? ''),
                ];
                $state = MilestoneState::from($milestone->state);
                $stateName = $state->getName();
                $utf8StateIcon = match ($state) {
                    MilestoneState::TODO => '⏳',
                    MilestoneState::IN_PROGRESS => '⚒️',
                    MilestoneState::DONE => '✅',
                };
                $message   = "{$utf8StateIcon} **{$request->user()->name}** changed milestone **{$milestone->name}** to **{$stateName}** (Project: {$milestone->project->name})";
                ChatSendMessageJob::dispatch($message, user: $pm, props: $props);
            }
        }

        return $milestone->fresh(['dependees', 'dependants']);
    }
    public function reorder(Request $request) {
        $data = $request->validate([
            'milestones'            => 'required|array',
            'milestones.*.id'       => 'required|integer|exists:milestones,id',
            'milestones.*.position' => 'required|integer',
        ]);

        foreach ($data['milestones'] as $milestoneData) {
            Milestone::where('id', $milestoneData['id'])
                ->update(['position' => $milestoneData['position']]);
        }
        return response()->json([
            'message'       => 'Milestones reordered successfully',
            'updated_count' => count($data['milestones']),
        ]);
    }
    public function addDependency(Request $request, Milestone $milestone) {
        $data = $request->validate([
            'depends_on' => 'required|integer|exists:milestones,id',
        ]);

        $dependsOnMilestone = Milestone::findOrFail($data['depends_on']);

        // Add dependency: this milestone depends on another milestone
        $milestone->dependees()->attach($dependsOnMilestone->id);
        return response()->json([
            'message'    => 'Dependency added successfully',
            'milestone'  => $milestone->load('dependees'),
            'depends_on' => $dependsOnMilestone,
        ]);
    }
    public function removeDependency(Request $request, Milestone $milestone) {
        $data = $request->validate([
            'depends_on' => 'required|integer|exists:milestones,id',
        ]);

        // Remove dependency
        $milestone->dependees()->detach($data['depends_on']);
        return response()->json([
            'message'   => 'Dependency removed successfully',
            'milestone' => $milestone->load('dependees'),
        ]);
    }
    public function removeDependencies(Request $request, Milestone $milestone) {
        $data = $request->validate([
            'depends_on_ids'   => 'required|array',
            'depends_on_ids.*' => 'integer|exists:milestones,id',
        ]);

        // Remove all dependencies
        $milestone->dependees()->detach($data['depends_on_ids']);
        return response()->json([
            'message'       => 'Dependencies removed successfully',
            'milestone'     => $milestone->load('dependees'),
            'removed_count' => count($data['depends_on_ids']),
        ]);
    }
    public function destroy(Milestone $milestone) {
        // Remove all dependencies before deleting
        $milestone->dependees()->detach();
        $milestone->dependants()->detach();

        // Detach all linked invoice items
        $milestone->invoiceItems()->detach();

        // Delete the milestone
        $milestone->delete();
        return response()->json([
            'message'    => 'Milestone deleted successfully',
            'deleted_id' => $milestone->id,
        ]);
    }
    public function destroyAllForProject(Request $request, $projectId) {
        $project = Project::findOrFail($projectId);

        // Get all milestones for this project
        $milestones     = $project->milestones;
        $milestoneCount = $milestones->count();

        if ($milestoneCount === 0) {
            return response()->json([
                'message'       => 'No milestones found for this project',
                'deleted_count' => 0,
            ]);
        }

        // Clean up dependencies and relationships for all milestones
        foreach ($milestones as $milestone) {
            // Remove all dependencies
            $milestone->dependees()->detach();
            $milestone->dependants()->detach();

            // Detach all linked invoice items
            $milestone->invoiceItems()->detach();
        }

        // Delete all milestones for this project
        $project->milestones()->delete();
        return response()->json([
            'message'       => 'All milestones deleted successfully',
            'project_id'    => $project->id,
            'deleted_count' => $milestoneCount,
        ]);
    }
}
