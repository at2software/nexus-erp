<?php

namespace App\Services;

use App\Models\LeadSource;
use App\Models\MarketingInitiative;
use App\Models\MarketingWorkflow;
use Illuminate\Http\Request;

class MarketingInitiativeService {
    public static function getInitiatives(Request $request) {
        $query = MarketingInitiative::with(['parent', 'children', 'channels', 'performanceMetrics', 'workflows', 'users'])
            ->withCount('prospects');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->boolean('root_only')) {
            $query->whereNull('parent_id');
        }

        if ($request->has('search')) {
            $query->where('name', 'like', '%'.$request->search.'%');
        }
        return $query->latest()->paginate(50)->withQueryString();
    }
    public static function createInitiative(array $validated, $user = null): MarketingInitiative {
        $initiative = MarketingInitiative::create($validated);

        if ($user) {
            $initiative->users()->attach($user->id, ['role' => 'owner']);
        }

        if (isset($validated['channels'])) {
            foreach ($validated['channels'] as $channel) {
                $initiative->channels()->attach($channel['lead_source_id'], [
                    'is_primary'      => $channel['is_primary'] ?? false,
                    'custom_settings' => $channel['custom_settings'] ?? null,
                ]);
            }
        }
        return $initiative->load(['channels', 'parent', 'users']);
    }
    public static function canDeleteInitiative(MarketingInitiative $initiative): ?string {
        if ($initiative->children()->exists()) {
            return 'Cannot delete initiative with sub-initiatives';
        }

        if ($initiative->prospects()->exists()) {
            return 'Cannot delete initiative with prospects';
        }
        return null;
    }
    public static function addChannel(MarketingInitiative $initiative, array $validated) {
        if ($initiative->channels()->where('lead_source_id', $validated['lead_source_id'])->exists()) {
            return null;
        }

        $initiative->channels()->attach($validated['lead_source_id'], [
            'is_primary'      => $validated['is_primary'] ?? false,
            'custom_settings' => $validated['custom_settings'] ?? null,
        ]);
        return $initiative->channels()->withPivot(['is_primary', 'custom_settings'])->get();
    }
    public static function removeChannel(MarketingInitiative $initiative, LeadSource $leadSource): ?array {
        if (! $initiative->channels()->where('lead_source_id', $leadSource->id)->exists()) {
            return null;
        }

        $initiative->channels()->detach($leadSource->id);
        return [
            'message'  => 'Channel removed successfully',
            'channels' => $initiative->channels()->withPivot(['is_primary', 'custom_settings'])->get(),
        ];
    }
    public static function updateChannels(MarketingInitiative $initiative, array $channels) {
        $syncData = [];
        foreach ($channels as $channel) {
            $syncData[$channel['lead_source_id']] = [
                'is_primary'      => $channel['is_primary'] ?? false,
                'custom_settings' => $channel['custom_settings'] ?? null,
            ];
        }

        $initiative->channels()->sync($syncData);
        return $initiative->channels()->withPivot(['is_primary', 'custom_settings'])->get();
    }
    public static function attachWorkflow(MarketingInitiative $initiative, int $workflowId, bool $isActive = true) {
        if ($initiative->workflows()->where('marketing_workflow_id', $workflowId)->exists()) {
            return null;
        }

        $initiative->workflows()->attach($workflowId, ['is_active' => $isActive]);

        // Copy workflow activities to initiative activities
        $workflow = MarketingWorkflow::with('orderedActivities')->find($workflowId);
        self::copyWorkflowActivitiesToInitiative($initiative, $workflow);

        return $initiative->workflows()->withPivot(['is_active'])->get();
    }

    public static function copyWorkflowActivitiesToInitiative(MarketingInitiative $initiative, MarketingWorkflow $workflow): void {
        $activityIdMap = [];

        // First pass: Create all activities
        foreach ($workflow->orderedActivities as $activity) {
            $newActivity = \App\Models\MarketingInitiativeActivity::create([
                'marketing_initiative_id' => $initiative->id,
                'marketing_workflow_id'   => $workflow->id,
                'name'                    => $activity->name,
                'day_offset'              => $activity->day_offset,
                'description'             => $activity->description,
                'is_required'             => $activity->is_required,
                'has_external_dependency' => $activity->has_external_dependency ?? false,
                'quick_action'            => $activity->quick_action,
                'parent_activity_id'      => null, // Will be updated in second pass
            ]);

            $activityIdMap[$activity->id] = $newActivity->id;
        }

        // Second pass: Update parent_activity_id references
        foreach ($workflow->orderedActivities as $activity) {
            if ($activity->parent_activity_id && isset($activityIdMap[$activity->parent_activity_id])) {
                \App\Models\MarketingInitiativeActivity::where('id', $activityIdMap[$activity->id])
                    ->update(['parent_activity_id' => $activityIdMap[$activity->parent_activity_id]]);
            }
        }
    }
    public static function detachWorkflow(MarketingInitiative $initiative, MarketingWorkflow $workflow): ?array {
        if (! $initiative->workflows()->where('marketing_workflow_id', $workflow->id)->exists()) {
            return null;
        }

        $initiative->workflows()->detach($workflow->id);
        return [
            'message'   => 'Workflow detached successfully',
            'workflows' => $initiative->workflows()->withPivot(['is_active'])->get(),
        ];
    }
    public static function subscribeUser(MarketingInitiative $initiative, int $userId, string $role = 'member'): ?array {
        if ($initiative->users()->where('user_id', $userId)->exists()) {
            return null;
        }

        $initiative->users()->attach($userId, ['role' => $role]);
        return [
            'message' => 'User subscribed successfully',
            'users'   => $initiative->users()->withPivot(['role'])->get(),
        ];
    }
    public static function unsubscribeUser(MarketingInitiative $initiative, int $userId): ?array {
        if (! $initiative->users()->where('user_id', $userId)->exists()) {
            return null;
        }

        $initiative->users()->detach($userId);
        return [
            'message' => 'User unsubscribed successfully',
            'users'   => $initiative->users()->withPivot(['role'])->get(),
        ];
    }

    // Initiative Activity Methods
    public static function createInitiativeActivity(\App\Models\MarketingInitiative $initiative, array $validated): \App\Models\MarketingInitiativeActivity {
        $activity = $initiative->marketingInitiativeActivities()->create([
            'marketing_workflow_id'    => $validated['marketing_workflow_id'] ?? null,
            'name'                     => $validated['name'],
            'day_offset'               => $validated['day_offset'],
            'description'              => $validated['description'] ?? '',
            'is_required'              => $validated['is_required'] ?? true,
            'has_external_dependency'  => $validated['has_external_dependency'] ?? false,
            'parent_activity_id'       => $validated['parent_activity_id'] ?? null,
            'quick_action'             => $validated['quick_action'] ?? null,
        ]);

        if (isset($validated['metric_ids'])) {
            $activity->performanceMetrics()->attach($validated['metric_ids']);
        }
        return $activity->load(['performanceMetrics', 'parentActivity', 'childActivities', 'i18n']);
    }

    public static function updateInitiativeActivity(\App\Models\MarketingInitiativeActivity $activity, array $validated): \App\Models\MarketingInitiativeActivity {
        $activity->update($validated);
        return $activity->load(['performanceMetrics', 'parentActivity', 'childActivities', 'i18n']);
    }

    public static function deleteInitiativeActivity(\App\Models\MarketingInitiativeActivity $activity): void {
        // Update child activities to remove parent reference
        \App\Models\MarketingInitiativeActivity::where('parent_activity_id', $activity->id)
            ->update(['parent_activity_id' => $activity->parent_activity_id]);

        // Note: We don't cascade delete prospect activities because they are
        // independent execution records once created
        
        $activity->delete();
    }
}
