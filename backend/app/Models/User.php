<?php

namespace App\Models;

use App\Actions\User\CalculateUserWorkloadStats;
use App\Actions\User\GetFocusAccuracyData;
use App\Actions\User\GetPredictionAccuracyData;
use App\Actions\User\GetUserAddressBook;
use App\Builders\UserBuilder;
use App\Casts\Permission;
use App\Enums\VacationState;
use App\Queries\TimeBasedEmploymentQuery;
use App\Traits\CustomModelTrait;
use App\Traits\HasFocusDisplay;
use App\Traits\HasI18nTrait;
use App\Traits\HasParams;
use App\Traits\HasTasksTrait;
use App\Traits\VcardGenderTrait;
use App\Traits\VcardTrait;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends BaseAuthenticatable {
    use CustomModelTrait;
    use HasApiTokens;
    use HasFactory;
    use HasFocusDisplay;
    use HasI18nTrait;
    use HasParams;
    use HasRoles;
    use HasTasksTrait;
    use Notifiable;
    use VcardGenderTrait;
    use VcardTrait;

    protected $hidden   = ['password', 'remember_token', 'created_at', 'updated_at', 'deleted_at', 'api_token'];
    protected $with     = ['activeEmployment'];
    protected $appends  = ['icon', 'class', 'is_retired', 'name', 'path', 'gender'];
    protected $fillable = ['color', 'current_focus_id', 'current_focus_type', 'name', 'email', 'password', 'vcard', 'work_zip'];
    protected $casts    = [
        'revenue' => Permission::class.':financial',
    ];
    protected $access = ['admin' => '*', 'hr' => '*', 'project_manager' => 'ru', 'user' => 'ru'];

    public function getPredictionAccuracyData($startDate): array {
        return app(GetPredictionAccuracyData::class)->execute($this, $startDate);
    }
    public function getFocusAccuracyData($startDate): array {
        return app(GetFocusAccuracyData::class)->execute($this, $startDate);
    }
    public function getIconAttribute(): string {
        return 'users/'.$this->id.'/icon?'.($this->updated_at ? $this->updated_at->timestamp : '');
    }
    public function getIsRetiredAttribute(): bool {
        if ($this->relationLoaded('activeEmployment')) {
            return is_null($this->activeEmployment);
        }
        return ! $this->activeEmployments()->exists();
    }
    public function activeEmployment() {
        return $this->hasOne(UserEmployment::class)->where('is_active', true)->latest();
    }
    public function getIsSickAttribute(): ?Carbon {
        if ($this->relationLoaded('active_sick_notes')) {
            return $this->active_sick_notes->sortByDesc('id')->first()?->ended_at;
        }
        return $this->active_sick_notes()->latest()->first()?->ended_at;
    }
    public function getIsOnVacationAttribute(): ?Carbon {
        if ($this->relationLoaded('activeVacations')) {
            return $this->activeVacations->sortByDesc('id')->first()?->ended_at;
        }
        return $this->activeVacations()->latest()->first()?->ended_at;
    }
    public function getAvailabilityStatusAttribute(): int {
        if ($this->current_focus) {
            return 1;
        }
        if ($this->relationLoaded('activeVacations') ? $this->activeVacations->isNotEmpty() : $this->activeVacations()->count()) {
            return -1;
        }
        if ($this->relationLoaded('active_sick_notes') ? $this->active_sick_notes->isNotEmpty() : $this->active_sick_notes()->count()) {
            return -2;
        }
        return 0;
    }
    public function getHpdAttribute(): float {
        if (count($this->activeEmployments)) {
            $ae = $this->activeEmployments[0];
            return ($ae->mo + $ae->tu + $ae->we + $ae->th + $ae->fr) / 5;
        }
        return 8;
    }
    public function getHpw(): float {
        if (count($this->activeEmployments)) {
            $ae = $this->activeEmployments[0];
            return $ae->mo + $ae->tu + $ae->we + $ae->th + $ae->fr;
        }
        return 40;
    }
    public function getHpwArray(): array {
        if (count($this->activeEmployments)) {
            $ae = $this->activeEmployments[0];
            return [$ae->mo, $ae->tu, $ae->we, $ae->th, $ae->fr, 0, 0];
        }
        return [8, 8, 8, 8, 8, 0, 0];
    }
    public function getLatestFociAttribute() {
        if ($this->relationLoaded('foci')) {
            return $this->foci
                ->filter(fn ($focus) => $focus->parent_id && $focus->parent_type)
                ->unique(fn ($item) => $item->parent_type.':'.$item->parent_id)
                ->map(fn ($_) => $_->only(['id', 'parent_name', 'parent_path']))
                ->take(10)
                ->values();
        }
        return Focus::query()
            ->where('user_id', $this->id)
            ->whereNotNull('parent_id')
            ->whereNotNull('parent_type')
            ->latest()
            ->limit(100)
            ->with('parent')
            ->get()
            ->unique(fn ($item) => $item->parent_type.':'.$item->parent_id)
            ->map(fn ($_) => $_->only(['id', 'parent_name', 'parent_path']))
            ->take(10)
            ->values();
    }
    public function getRoleNamesAttribute() {
        return $this->getRoleNames();
    }

    /**
     * Check if user has specific role(s)
     * Admin always returns true  
     */
    public function hasRole($roles, string $guard = null): bool {
        return $this->hasAnyRole($roles, $guard);
    }

    /**
     * Check if user has any of the specified roles
     * Admin always returns true
     */
    public function hasAnyRole($roles, string $guard = null): bool {
        // Normalize input to array
        if (is_string($roles)) {
            $roles = explode('|', $roles);
        }
        
        // Admin has all roles
        if ($this->roles()->where('name', 'admin')->exists()) {
            return true;
        }
        
        // Check if user has any of the specified roles
        return $this->roles()->whereIn('name', $roles)->exists();
    }

    public function comments() {
        return $this->hasMany(Comment::class);
    }
    public function foci() {
        return $this->hasMany(Focus::class);
    }
    public function current_focus() {
        return $this->morphTo();
    }
    public function assignments() {
        return $this->hasManyMorph(Assignment::class);
    }
    public function projects() {
        return $this->morphedByMany(Project::class, 'parent', 'assignments', 'assignee_id');
    }
    public function activeProjects() {
        return $this->projects()->whereProgress(ProjectState::Running)->withPivot('hours_planned', 'hours_weekly', 'id');
    }
    public function marketingInitiatives() {
        return $this->belongsToMany(MarketingInitiative::class, 'marketing_initiative_user')
            ->withPivot(['role', 'receives_notifications'])
            ->withTimestamps();
    }
    public function marketingProspects() {
        return $this->hasMany(MarketingProspect::class);
    }
    public function activeVacations() {
        return $this->approvedVacations()
            ->where('started_at', '<', now())
            ->where('ended_at', '>=', now()->startOfDay());
    }
    public function active_sick_notes() {
        return $this->vacations()
            ->whereState(VacationState::Sick)
            ->where('started_at', '<', now())
            ->where('ended_at', '>=', now()->startOfDay());
    }
    public function assigned_projects($state = [ProjectState::Running]) {
        return $this->projects()->withPivot('hours_planned', 'hours_weekly', 'id')->whereProgress(ProjectState::Running);
    }
    public function assigned_companies() {
        return $this->morphedByMany(Company::class, 'parent', 'assignments', 'assignee_id')->withPivot('hours_planned', 'hours_weekly', 'id');
    }
    public function group() {
        return $this->belongsTo(UserGroup::class);
    }
    public function sentinels() {
        return $this->hasMany(Sentinel::class);
    }
    public function subscribedSentinels() {
        return $this->belongsToMany(Sentinel::class, 'sentinel_users');
    }
    public function predictions() {
        return $this->hasMany(InvoiceItemPrediction::class);
    }
    public function encryptions() {
        return $this->hasMany(Encryption::class);
    }
    public function vacation_grants() {
        return $this->hasMany(VacationGrant::class);
    }
    public function vacations() {
        return $this->hasManyThrough(Vacation::class, VacationGrant::class);
    }
    public function approvedVacations(?Carbon $after = null, ?Carbon $before = null) {
        $query = $this->vacations()->where('state', VacationState::Approved)->where('vacations.amount', '<', '0');
        if ($after) {
            $query->where('ended_at', '>', $after);
        }
        if ($before) {
            $query->where('started_at', '<', $before);
        }
        return $query;
    }
    public function currentSickNotes(?Carbon $after = null, ?Carbon $before = null) {
        $query = $this->vacations()->where('state', VacationState::Sick);
        if ($after) {
            $query->where('ended_at', '>', $after);
        }
        if ($before) {
            $query->where('started_at', '<', $before);
        }
        return $query;
    }
    public function employments() {
        return $this->hasMany(UserEmployment::class);
    }
    public function activeEmployments() {
        return $this->employments()->where('is_active', true);
    }
    public function timePayments() {
        return $this->hasMany(UserPaidTime::class);
    }
    public function milestones() {
        return $this->hasMany(Milestone::class);
    }
    public function getAddressBook(): array {
        return app(GetUserAddressBook::class)->execute($this);
    }
    public function getDashboards() {
        $dashboards = $this->param('DASHBOARDS')?->value;
        if (! $dashboards) {
            $dashboards            = '[]';
            $dashboardParam        = $this->param('DASHBOARDS');
            $dashboardParam->value = $dashboards;
            $dashboardParam->save();
        }
        return json_decode($dashboards);
    }
    public function getTimeBasedEmploymentInfo(): ?array {
        return app(TimeBasedEmploymentQuery::class)->getInfo($this);
    }
    public function getTimeBasedEmploymentTable(): ?array {
        return app(TimeBasedEmploymentQuery::class)->getTable($this);
    }
    public function newEloquentBuilder($query) {
        return new UserBuilder($query);
    }
    public function getWorkloadStats(array $workData, array $holidays): array {
        return app(CalculateUserWorkloadStats::class)->execute($this, $workData, $holidays);
    }
}
