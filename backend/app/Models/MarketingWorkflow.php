<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class MarketingWorkflow extends BaseModel {
    protected $table    = 'marketing_workflows';
    protected $fillable = [
        'name',
        'description',
        'is_active',
    ];
    protected $casts = [
        'is_active' => 'boolean',
    ];

    // Relationships
    public function marketingInitiatives(): BelongsToMany {
        return $this->belongsToMany(MarketingInitiative::class, 'marketing_initiative_workflow')
            ->withPivot(['is_active'])
            ->withTimestamps();
    }
    public function activeInitiatives(): BelongsToMany {
        return $this->marketingInitiatives()->wherePivot('is_active', true);
    }
    public function marketingActivities(): HasMany {
        return $this->hasMany(MarketingActivity::class, 'marketing_workflow_id');
    }

    // Prospect activities scheduled via this workflow's initiative activities
    public function prospectActivities(): HasManyThrough {
        return $this->hasManyThrough(
            MarketingProspectActivity::class,
            MarketingInitiativeActivity::class,
            'marketing_workflow_id',          // FK on marketing_initiative_activities
            'marketing_initiative_activity_id', // FK on marketing_prospect_activities
            'id',                             // local key on marketing_workflows
            'id'                              // local key on marketing_initiative_activities
        );
    }
    public function orderedActivities(): HasMany {
        return $this->marketingActivities()->orderBy('day_offset');
    }

    // Scopes
    public function scopeActive($query) {
        return $query->where('is_active', true);
    }

    // Helper methods
    public function getTotalDuration(): int {
        return $this->marketingActivities()->max('day_offset') ?: 0;
    }
    public function getActivitiesForDay(int $day): Collection {
        return $this->marketingActivities()
            ->where('day_offset', $day)
            ->orderBy('day_offset')
            ->get();
    }

    /**
     * @deprecated No longer used. Prospects now initialize activities from initiative activities via MarketingProspect::initializeWorkflowActivities()
     */
    public function createProspectActivities(MarketingProspect $prospect): void {
        $activities = $this->orderedActivities()->get();
        $baseDate   = $prospect->created_at;

        // Sort activities to ensure parents are processed before children
        $sortedActivities = $this->topologicalSort($activities);

        // Create prospect activities in correct order
        $createdActivities = [];
        foreach ($sortedActivities as $activity) {
            // Calculate scheduled date based on parent or base date
            if ($activity->parent_activity_id && isset($createdActivities[$activity->parent_activity_id])) {
                // For dependent activities: schedule relative to parent's scheduled date
                $parentScheduledAt = $createdActivities[$activity->parent_activity_id];
                $scheduledAt       = $parentScheduledAt->copy()->addDays($activity->day_offset);
            } else {
                // For independent activities: schedule relative to prospect creation
                // day_offset = 1 means first day (same as creation day), so subtract 1
                $scheduledAt = $baseDate->copy()->addDays($activity->day_offset - 1);
            }

            $prospectActivity = MarketingProspectActivity::create([
                'marketing_prospect_id' => $prospect->id,
                'marketing_activity_id' => $activity->id,
                'scheduled_at'          => $scheduledAt,
                'status'                => 'pending',
            ]);

            // Store for potential child activities
            $createdActivities[$activity->id] = $scheduledAt;
        }
    }

    /**
     * Sort activities to ensure parents are processed before children (topological sort)
     */
    private function topologicalSort($activities): array {
        $sorted         = [];
        $visited        = [];
        $activitiesById = [];

        // Index activities by ID
        foreach ($activities as $activity) {
            $activitiesById[$activity->id] = $activity;
        }

        // Recursive visit function
        $visit = function ($activity) use (&$visit, &$sorted, &$visited, $activitiesById) {
            if (isset($visited[$activity->id])) {
                return;
            }

            $visited[$activity->id] = true;

            // Visit parent first if it exists
            if ($activity->parent_activity_id && isset($activitiesById[$activity->parent_activity_id])) {
                $visit($activitiesById[$activity->parent_activity_id]);
            }

            // Add current activity to sorted list
            $sorted[] = $activity;
        };

        // Visit all activities
        foreach ($activities as $activity) {
            $visit($activity);
        }
        return $sorted;
    }

    public function duplicate(?string $newName = null): self {
        $copy       = $this->replicate();
        $copy->name = $newName ?: ($this->name.' (Copy)');
        $copy->save();

        // Duplicate activities
        foreach ($this->marketingActivities as $activity) {
            $activityCopy                        = $activity->replicate();
            $activityCopy->marketing_workflow_id = $copy->id;
            $activityCopy->save();
        }
        return $copy;
    }
}
