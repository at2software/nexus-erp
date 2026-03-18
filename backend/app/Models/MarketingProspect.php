<?php

namespace App\Models;

use App\Traits\VcardGenderTrait;
use App\Traits\VcardTrait;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MarketingProspect extends BaseModel {
    use VcardGenderTrait;
    use VcardTrait;

    protected $table    = 'marketing_prospects';
    protected $fillable = [
        'marketing_initiative_id',
        'lead_source_id',
        'user_id',
        'company_id',
        'company_contact_id',
        'vcard',
        'status',
        'days_skipped',
        'added_via',
        'external_data',
        'notes',
        'color'
    ];
    protected $casts = [
        'external_data' => 'array',
    ];
    protected $appends = [
        'gender',
    ];

    // Relationships
    public function marketingInitiative(): BelongsTo {
        return $this->belongsTo(MarketingInitiative::class);
    }
    public function leadSource(): BelongsTo {
        return $this->belongsTo(LeadSource::class);
    }
    public function user(): BelongsTo {
        return $this->belongsTo(User::class);
    }
    public function company(): BelongsTo {
        return $this->belongsTo(Company::class);
    }
    public function companyContact(): BelongsTo {
        return $this->belongsTo(CompanyContact::class);
    }
    public function activities(): HasMany {
        return $this->hasMany(MarketingProspectActivity::class, 'marketing_prospect_id');
    }
    public function pendingActivities(): HasMany {
        return $this->activities()->where('status', 'pending');
    }
    public function completedActivities(): HasMany {
        return $this->activities()->where('status', 'completed');
    }
    public function overdueActivities(): HasMany {
        return $this->activities()
            ->where('status', 'pending')
            ->where('scheduled_at', '<', now());
    }
    public function todayActivities(): HasMany {
        return $this->activities()
            ->where('status', 'pending')
            ->whereDate('scheduled_at', today());
    }

    // Scopes
    public function scopeByStatus($query, string $status) {
        return $query->where('status', $status);
    }
    public function scopeByChannel($query, int $leadSourceId) {
        return $query->where('lead_source_id', $leadSourceId);
    }
    public function scopeAddedViaAddon($query) {
        return $query->where('added_via', 'addon');
    }
    public function scopeRecentlyAdded($query, int $days = 7) {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    // Helper methods
    public function getStatusLabel(): string {
        return match ($this->status) {
            'new'          => 'New',
            'engaged'      => 'Engaged',
            'converted'    => 'Converted',
            'unresponsive' => 'Unresponsive',
            'disqualified' => 'Disqualified',
            'on_hold'      => 'On Hold',
            default        => ucfirst($this->status)
        };
    }
    public function getNextActivity(): ?MarketingProspectActivity {
        return $this->pendingActivities()
            ->with('marketingInitiativeActivity')
            ->orderBy('scheduled_at')
            ->first();
    }
    public function getCompletionRate(): float {
        $total = $this->activities()->count();

        if ($total === 0) {
            return 0;
        }

        $completed = $this->completedActivities()->count();
        return ($completed / $total) * 100;
    }
    public function hasOverdueActivities(): bool {
        return $this->overdueActivities()->exists();
    }
    public function markActivityCompleted(int $activityId, ?string $notes = null, ?float $performanceValue = null): bool {
        $activity = $this->activities()->with('marketingInitiativeActivity')->find($activityId);

        if (! $activity || $activity->status !== 'pending') {
            return false;
        }

        $activity->update([
            'status'            => 'completed',
            'completed_at'      => now(),
            'notes'             => $notes,
            'performance_value' => $performanceValue,
        ]);

        // Update prospect status if all activities are completed
        if (! $this->pendingActivities()->exists()) {
            $this->update(['status' => 'engaged']);
        }
        return true;
    }
    public function initializeWorkflowActivities(): void {
        // Get all initiative activities for this prospect's initiative
        $initiativeActivities = $this->marketingInitiative->orderedInitiativeActivities;

        if ($initiativeActivities->isEmpty()) {
            return;
        }

        $baseDate = $this->created_at;

        // Sort activities to ensure parents are processed before children (topological sort)
        $sortedActivities = $this->topologicalSort($initiativeActivities);

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
                'marketing_prospect_id'            => $this->id,
                'marketing_initiative_activity_id' => $activity->id,
                'scheduled_at'                     => $scheduledAt,
                'status'                           => 'pending',
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
    public function getDaysInWorkflow(): int {
        return $this->created_at->diffInDays(now());
    }

    // Virtual accessors from vCard
    public function getLinkedinUrlAttribute(): ?string {
        return $this->vcard->getFirstValue('URL', null);
    }
    public function getPhoneAttribute(): ?string {
        return $this->vcard->getFirstValue('TEL');
    }
    public function getCompanyAttribute(): ?string {
        return $this->vcard->getFirstValue('ORG');
    }
    public function getPositionAttribute(): ?string {
        return $this->vcard->getFirstValue('TITLE');
    }
    public function getLinkedInProfileId(): ?string {
        $linkedinUrl = $this->linkedin_url;

        if (! $linkedinUrl) {
            return null;
        }

        // Extract LinkedIn profile ID from URL
        preg_match('/\/in\/([^\/\?]+)/', $linkedinUrl, $matches);
        return $matches[1] ?? null;
    }
    public function postponeActivities(int $days): bool {
        // Postpone all pending activities
        $updated = $this->activities()
            ->where('status', 'pending')
            ->update([
                'scheduled_at' => \DB::raw("DATE_ADD(scheduled_at, INTERVAL {$days} DAY)"),
            ]);

        // Increment days_skipped counter
        $this->increment('days_skipped', $days);
        return $updated > 0;
    }
    public function getLastCompletedActivityAtAttribute(): ?string {
        $lastCompletedAt = $this->activities()
            ->where('status', 'completed')
            ->whereNotNull('completed_at')
            ->max('completed_at');
        return $lastCompletedAt;
    }
}
