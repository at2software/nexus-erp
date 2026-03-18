<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketingInitiative extends BaseModel {
    protected $table    = 'marketing_initiatives';
    protected $fillable = [
        'name',
        'parent_id',
        'description',
        'status',
        'start_date',
        'end_date',
    ];
    protected $casts = [
        'start_date' => 'date',
        'end_date'   => 'date',
    ];

    // Self-referencing relationship
    public function parent(): BelongsTo {
        return $this->belongsTo(MarketingInitiative::class, 'parent_id');
    }
    public function children(): HasMany {
        return $this->hasMany(MarketingInitiative::class, 'parent_id');
    }
    public function allChildren(): HasMany {
        return $this->children()->with('allChildren');
    }

    // Channel relationships
    public function channels(): BelongsToMany {
        return $this->belongsToMany(LeadSource::class, 'marketing_initiative_channels', 'marketing_initiative_id', 'lead_source_id')
            ->withPivot(['is_primary', 'custom_settings'])
            ->withTimestamps();
    }
    public function primaryChannel(): BelongsToMany {
        return $this->channels()->wherePivot('is_primary', true);
    }

    // Performance metrics (many-to-many)
    public function performanceMetrics(): BelongsToMany {
        return $this->belongsToMany(MarketingPerformanceMetric::class, 'marketing_initiative_metric')
            ->withPivot(['target_value'])
            ->withTimestamps();
    }

    // Workflows (many-to-many)
    public function workflows(): BelongsToMany {
        return $this->belongsToMany(MarketingWorkflow::class, 'marketing_initiative_workflow')
            ->withPivot(['is_active'])
            ->withTimestamps();
    }
    public function activeWorkflows(): BelongsToMany {
        return $this->workflows()->wherePivot('is_active', true);
    }

    // Prospects
    public function prospects(): HasMany {
        return $this->hasMany(MarketingProspect::class);
    }

    // Initiative Activities (copied from workflows)
    public function initiativeActivities(): HasMany {
        return $this->hasMany(MarketingInitiativeActivity::class, 'marketing_initiative_id');
    }

    public function orderedInitiativeActivities(): HasMany {
        return $this->initiativeActivities()->orderBy('day_offset');
    }

    // User subscriptions (many-to-many)
    public function users(): BelongsToMany {
        return $this->belongsToMany(User::class, 'marketing_initiative_user')
            ->withPivot(['role', 'receives_notifications'])
            ->withTimestamps();
    }
    public function owners(): BelongsToMany {
        return $this->users()->wherePivot('role', 'owner');
    }
    public function members(): BelongsToMany {
        return $this->users()->wherePivot('role', 'member');
    }

    // Scopes
    public function scopeActive($query) {
        return $query->where('status', 'active');
    }
    public function scopeRootInitiatives($query) {
        return $query->whereNull('parent_id');
    }

    // Helper methods
    public function isActive(): bool {
        return $this->status === 'active';
    }
    public function getAllMetrics() {
        // Get direct metrics with pivot data
        $metrics = $this->performanceMetrics()->withPivot(['target_value'])->get();

        // Get metrics from workflow activities
        $workflowMetrics = MarketingPerformanceMetric::whereHas('marketingActivities', function ($query) {
            $query->whereHas('marketingWorkflow', function ($q) {
                $q->whereHas('marketingInitiatives', function ($qi) {
                    $qi->where('marketing_initiatives.id', $this->id);
                });
            });
        })->get();

        // Merge and calculate current_value for each metric (scoped to this initiative)
        return $metrics->merge($workflowMetrics)->unique('id')->map(function ($metric) {
            // Find initiative activities that track this metric
            // We need to find initiative activities that were copied from workflow activities linked to this metric
            $initiativeActivityIds = MarketingInitiativeActivity::where('marketing_initiative_id', $this->id)
                ->whereIn('marketing_workflow_id', function($query) use ($metric) {
                    $query->select('marketing_workflow_id')
                        ->from('marketing_activities')
                        ->whereIn('id', function($subQuery) use ($metric) {
                            $subQuery->select('marketing_activity_id')
                                ->from('marketing_activity_metric')
                                ->where('marketing_performance_metric_id', $metric->id);
                        });
                })
                ->pluck('id');

            // Base query for prospect activities for this initiative's activities
            $baseQuery = MarketingProspectActivity::whereHas('marketingProspect', function ($q) {
                $q->where('marketing_initiative_id', $this->id);
            })->whereIn('marketing_initiative_activity_id', $initiativeActivityIds);

            // Calculate activity statistics
            $total       = (clone $baseQuery)->count();
            $completed   = (clone $baseQuery)->where('status', 'completed')->count();
            $skipped     = (clone $baseQuery)->where('status', 'skipped')->count();
            $overdue     = (clone $baseQuery)->where('status', 'pending')->where('scheduled_at', '<', now())->count();
            $pending     = (clone $baseQuery)->where('status', 'pending')->count() - $overdue;

            $metric->activity_stats = [
                'total'     => $total,
                'completed' => $completed,
                'skipped'   => $skipped,
                'pending'   => $pending,
                'overdue'   => $overdue,
            ];

            $metric->current_value = $completed;
            return $metric;
        });
    }
    public function getProspectsCountByStatus(): array {
        return $this->prospects()
            ->selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status')
            ->toArray();
    }
}
