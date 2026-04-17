<?php

namespace App\Models;

use App\Traits\VcardGenderTrait;
use App\Traits\VcardTrait;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

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
        'color',
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
                'scheduled_at' => DB::raw("DATE_ADD(scheduled_at, INTERVAL {$days} DAY)"),
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
    public static function filteredQuery(Request $request) {
        $query = static::with(['marketingInitiative', 'leadSource', 'activities.marketingInitiativeActivity', 'company', 'companyContact.contact', 'companyContact.company', 'user']);

        if ($request->has('marketing_initiative_id')) {
            $query->where('marketing_initiative_id', $request->marketing_initiative_id);
        }
        if ($request->has('lead_source_id')) {
            $query->where('lead_source_id', $request->lead_source_id);
        }
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('added_via')) {
            $query->where('added_via', $request->added_via);
        }
        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->has('linkedin_url')) {
            $linkedinUrl = $request->linkedin_url;
            if (preg_match('#linkedin\.com(/in/[^/?]+)#i', $linkedinUrl, $matches)) {
                $query->where('vcard', 'like', "%{$matches[1]}%");
            } else {
                $query->where('vcard', 'like', "%{$linkedinUrl}%");
            }
        }
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('company', 'like', "%{$search}%")
                    ->orWhere('email', 'like', "%{$search}%");
            });
        }
        if ($request->has('company_id')) {
            $companyId = $request->company_id;
            $query->where(function ($q) use ($companyId) {
                $q->where('company_id', $companyId)
                    ->orWhereHas('companyContact', fn ($q2) => $q2->where('company_id', $companyId));
            });
        }

        $prospects = $query->latest()->get();
        $prospects->each(function ($prospect) {
            $prospect->has_overdue_activities = $prospect->activities()
                ->where('status', 'pending')->where('scheduled_at', '<=', now())->exists();
        });
        return $prospects;
    }
    public static function getStats(): array {
        $statusCounts = static::selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->pluck('count', 'status');

        $byStatus = collect(['new', 'engaged', 'converted', 'unresponsive', 'disqualified', 'on_hold'])
            ->mapWithKeys(fn ($s) => [$s => (int)($statusCounts[$s] ?? 0)])
            ->all();

        $activityCounts = MarketingProspectActivity::where('status', 'pending')
            ->selectRaw('COUNT(*) as total, SUM(scheduled_at < NOW()) as overdue')
            ->first();

        return [
            'total'              => $statusCounts->sum(),
            'by_status'          => $byStatus,
            'activities_pending' => (int)$activityCounts->total,
            'activities_overdue' => (int)$activityCounts->overdue,
        ];
    }
    public static function createFromAddon(array $validated, $user): mixed {
        $vcard       = new Vcard($validated['vcard']);
        $linkedinUrl = $vcard->getFirstValue('URL');

        if ($linkedinUrl) {
            $existing = static::where('marketing_initiative_id', $validated['marketing_initiative_id'])
                ->get()
                ->first(fn ($p) => $p->linkedin_url === $linkedinUrl);

            if ($existing) {
                return ['error' => 'Prospect already exists', 'prospect' => $existing];
            }
        }

        if (! $vcard->getFirstValue('FN')) {
            $nAttr = $vcard->getFirstAttr('N');
            if ($nAttr) {
                $nParts     = explode(';', $nAttr);
                $familyName = $nParts[0] ?? '';
                $givenName  = $nParts[1] ?? '';
                $fullName   = trim($givenName.' '.$familyName);
                if ($fullName) {
                    $vcard->setProperty('FN', $fullName);
                    $validated['vcard'] = $vcard->toVCardString();
                }
            }
        }

        $validated['added_via'] = 'addon';
        $validated['user_id']   = $user->id;
        $prospect               = static::create($validated);
        return ['prospect' => $prospect->load(['activities.marketingInitiativeActivity', 'user'])];
    }
    public function linkToCompany(int $companyId): static {
        $prospectVcard = new Vcard($this->attributes['vcard'] ?? '');

        $fn    = $prospectVcard->getFirstValue('FN');
        $nAttr = $prospectVcard->getFirstAttr('N');
        $url   = $prospectVcard->getFirstValue('URL');

        $contactVcard = new Vcard;
        if ($fn) {
            $contactVcard->setProperty('FN', $fn);
        }
        if ($nAttr) {
            $contactVcard->setProperty('N', $nAttr);
        }
        if ($url) {
            $contactVcard->setProperty('URL', $url);
        }

        $contact = Contact::create(['vcard' => $contactVcard->toVCardString()]);

        $companyContact = CompanyContact::create([
            'contact_id' => $contact->id,
            'company_id' => $companyId,
            'vcard'      => (new Vcard($this->attributes['vcard'] ?? ''))->toVCardString(),
        ]);

        $this->update([
            'company_contact_id' => $companyContact->id,
            'company_id'         => null,
        ]);
        return $this->load(['company', 'companyContact.company']);
    }
    public function convert(bool $createNew, ?int $companyId, ?string $companyName): mixed {
        if ($this->company_contact_id) {
            return ['error' => 'Prospect already converted'];
        }

        $prospectVcard       = $this->vcard;
        $prospectVcardString = $prospectVcard->toVCardString(false);

        $fn    = $prospectVcard->getFirstValue('FN');
        $nAttr = $prospectVcard->getFirstAttr('N');

        if (! $fn && ! $nAttr && empty($prospectVcardString)) {
            return ['error' => 'Prospect has no vcard data - cannot convert'];
        }

        if (! $nAttr && $fn) {
            $nameParts  = explode(' ', $fn);
            $familyName = array_pop($nameParts);
            $givenName  = implode(' ', $nameParts);
            $nAttr      = [$familyName, $givenName, '', '', ''];
        }

        DB::beginTransaction();
        try {
            $contactVcard = new Vcard($prospectVcardString);
            $contactVcard->remove(['ORG', 'TITLE', 'ADR', 'TEL', 'EMAIL']);
            if ($fn) {
                $contactVcard->setProperty('FN', $fn);
            }
            if ($nAttr) {
                $contactVcard->setProperty('N', $nAttr);
            }

            $contact = Contact::create(['vcard' => $contactVcard->toVCardString(), 'flags' => 0]);

            $companyContactVcard = new Vcard($prospectVcardString);
            $companyContactVcard->remove(['ORG', 'FN', 'N']);

            $targetCompanyId = null;
            if ($createNew && ! empty($companyName)) {
                $companyVcard = new Vcard;
                $companyVcard->setProperty('FN', $companyName);
                $companyVcard->setProperty('ORG', $companyName);
                $company         = Company::create(['vcard' => $companyVcard->toVCardString(), 'flags' => 0]);
                $targetCompanyId = $company->id;
            } elseif (! empty($companyId)) {
                $targetCompanyId = $companyId;
            }

            $companyContact = CompanyContact::create([
                'contact_id' => $contact->id,
                'company_id' => $targetCompanyId,
                'vcard'      => $companyContactVcard->toVCardString(),
                'flags'      => 0,
            ]);

            $this->update([
                'company_contact_id' => $companyContact->id,
                'company_id'         => null,
            ]);

            DB::commit();
            return ['prospect' => $this->load(['companyContact.contact', 'companyContact.company'])];
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Prospect conversion failed:', ['error' => $e->getMessage()]);
            return ['error' => 'Conversion failed: '.$e->getMessage()];
        }
    }
}
