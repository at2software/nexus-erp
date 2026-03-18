<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class MarketingPerformanceMetric extends BaseModel {
    protected $table    = 'marketing_performance_metrics';
    protected $fillable = [
        'name',
        'description',
        'metric_type',
        'target_value',
    ];
    protected $casts = [
        'target_value' => 'decimal:2',
    ];

    // Relationships
    public function marketingInitiatives(): BelongsToMany {
        return $this->belongsToMany(MarketingInitiative::class, 'marketing_initiative_metric')
            ->withPivot(['target_value'])
            ->withTimestamps();
    }
    public function marketingActivities(): BelongsToMany {
        return $this->belongsToMany(MarketingActivity::class, 'marketing_activity_metric')
            ->withPivot(['target_value'])
            ->withTimestamps();
    }
    public function prospectActivities() {
        // Find initiative activities that were created from workflow activities linked to this metric
        $initiativeActivityIds = \App\Models\MarketingInitiativeActivity::whereIn('marketing_workflow_id', function($query) {
            $query->select('marketing_workflow_id')
                ->from('marketing_activities')
                ->whereIn('id', function($subQuery) {
                    $subQuery->select('marketing_activity_id')
                        ->from('marketing_activity_metric')
                        ->where('marketing_performance_metric_id', $this->id);
                });
        })->pluck('id');

        return MarketingProspectActivity::whereIn('marketing_initiative_activity_id', $initiativeActivityIds);
    }

    // Scopes
    public function scopeByType($query, string $type) {
        return $query->where('metric_type', $type);
    }

    // Calculate current value based on completed prospect activities
    public function getCurrentValue(): float {
        return $this->prospectActivities()->count();
    }
    public function getProgressPercentage(): float {
        if (! $this->target_value || $this->target_value == 0) {
            return 0;
        }
        return min(100, ($this->getCurrentValue() / $this->target_value) * 100);
    }
    public function isTargetMet(): bool {
        if (! $this->target_value) {
            return false;
        }
        return $this->getCurrentValue() >= $this->target_value;
    }

    // Get activity statistics for this metric
    public function getActivityStatistics(): array {
        $baseQuery = $this->prospectActivities();

        $total       = (clone $baseQuery)->count();
        $completed   = (clone $baseQuery)->where('status', 'completed')->count();
        $skipped     = (clone $baseQuery)->where('status', 'skipped')->count();
        $overdue     = (clone $baseQuery)->where('status', 'pending')->where('scheduled_at', '<', now())->count();
        $pending     = (clone $baseQuery)->where('status', 'pending')->count() - $overdue;
        return [
            'total'     => $total,
            'completed' => $completed,
            'skipped'   => $skipped,
            'pending'   => $pending,
            'overdue'   => $overdue,
        ];
    }
}
