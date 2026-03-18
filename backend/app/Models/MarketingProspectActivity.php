<?php

namespace App\Models;

use Carbon\Carbon;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MarketingProspectActivity extends BaseModel {
    protected $table    = 'marketing_prospect_activities';
    protected $fillable = [
        'marketing_prospect_id',
        'marketing_initiative_activity_id',
        'scheduled_at',
        'completed_at',
        'status',
        'notes',
        'performance_value',
    ];
    protected $casts = [
        'scheduled_at'      => 'datetime',
        'completed_at'      => 'datetime',
        'performance_value' => 'decimal:2',
    ];

    // Relationships
    public function marketingProspect(): BelongsTo {
        return $this->belongsTo(MarketingProspect::class, 'marketing_prospect_id');
    }
    public function marketingInitiativeActivity(): BelongsTo {
        return $this->belongsTo(MarketingInitiativeActivity::class, 'marketing_initiative_activity_id');
    }

    // Legacy support - keep for backwards compatibility with frontend
    public function marketingActivity(): BelongsTo {
        return $this->marketingInitiativeActivity();
    }

    // Scopes
    public function scopePending($query) {
        return $query->where('status', 'pending');
    }
    public function scopeCompleted($query) {
        return $query->where('status', 'completed');
    }
    public function scopeOverdue($query) {
        return $query->where('status', 'pending')
            ->where('scheduled_at', '<', now());
    }
    public function scopeDueToday($query) {
        return $query->where('status', 'pending')
            ->whereDate('scheduled_at', today());
    }
    public function scopeDueTomorrow($query) {
        return $query->where('status', 'pending')
            ->whereDate('scheduled_at', tomorrow());
    }
    public function scopeByActivityType($query, string $type) {
        return $query->whereHas('marketingActivity', fn ($q) => $q->where('activity_type', $type));
    }

    // Helper methods
    public function getStatusLabel(): string {
        return match ($this->status) {
            'pending'   => 'Pending',
            'completed' => 'Completed',
            'skipped'   => 'Skipped',
            'overdue'   => 'Overdue',
            'failed'    => 'Failed',
            default     => ucfirst($this->status)
        };
    }
    public function isOverdue(): bool {
        return $this->status === 'pending' && $this->scheduled_at < now();
    }
    public function isDueToday(): bool {
        return $this->status === 'pending' && $this->scheduled_at->isToday();
    }
    public function isDueTomorrow(): bool {
        return $this->status === 'pending' && $this->scheduled_at->isTomorrow();
    }
    public function canBeCompleted(): bool {
        return in_array($this->status, ['pending', 'overdue']);
    }
    public function markCompleted(?string $notes = null, ?float $performanceValue = null): bool {
        if (! $this->canBeCompleted()) {
            return false;
        }
        return $this->update([
            'status'            => 'completed',
            'completed_at'      => now(),
            'notes'             => $notes,
            'performance_value' => $performanceValue,
        ]);
    }
    public function markSkipped(?string $reason = null): bool {
        if (! $this->canBeCompleted()) {
            return false;
        }
        return $this->update([
            'status' => 'skipped',
            'notes'  => $reason,
        ]);
    }
    public function reschedule(Carbon $newDate): bool {
        if ($this->status !== 'pending') {
            return false;
        }
        return $this->update(['scheduled_at' => $newDate]);
    }
    public function getDaysUntilDue(): int {
        return now()->diffInDays($this->scheduled_at, false);
    }
    public function getTimeUntilDue(): string {
        if ($this->isOverdue()) {
            return 'Overdue by '.$this->scheduled_at->diffForHumans(now(), true);
        }

        if ($this->isDueToday()) {
            return 'Due today';
        }

        if ($this->isDueTomorrow()) {
            return 'Due tomorrow';
        }
        return 'Due '.$this->scheduled_at->diffForHumans();
    }
    public function getLinkedInActionUrl(): ?string {
        $prospect = $this->marketingProspect;

        if (! $prospect->linkedin_url) {
            return null;
        }

        // Generate appropriate LinkedIn action URLs based on activity type
        return match ($this->marketingActivity->activity_type) {
            'connection_request' => $prospect->linkedin_url,
            'send_message'       => $prospect->linkedin_url.'/overlay/contact-info/',
            'like_post', 'comment_post' => $prospect->linkedin_url.'/recent-activity/',
            'view_profile' => $prospect->linkedin_url,
            default        => $prospect->linkedin_url
        };
    }
}
