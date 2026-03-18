<?php

namespace App\Models;

use App\Builders\ProjectBuilder;
use App\Casts\Permission;
use App\Casts\Precomputed;
use App\Casts\PrecomputedAuth;
use App\Collections\ProjectCollection;
use App\Enums\InvoiceItemType;
use App\Queries\ProjectTimelineQuery;
use App\Traits\CanMakeInvoiceTrait;
use App\Traits\HasAssignmentsTrait;
use App\Traits\HasFilesTrait;
use App\Traits\HasFociTrait;
use App\Traits\HasInvoiceItemsTrait;
use App\Traits\HasProjectStateTrait;
use App\Traits\HasPaymentPlanTrait;
use App\Traits\HasQuoteDescriptionsTrait;
use App\Traits\HasTasksTrait;
use App\Traits\PrecomputedTrait;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;

class Project extends BaseModel {
    use CanMakeInvoiceTrait;
    use HasAssignmentsTrait;
    use HasFactory;
    use HasFilesTrait;
    use HasFociTrait;
    use HasInvoiceItemsTrait;
    use HasPaymentPlanTrait;
    use HasProjectStateTrait;
    use HasQuoteDescriptionsTrait;
    use HasTasksTrait;
    use PrecomputedTrait;
    use SoftDeletes;

    public const ADDS = [InvoiceItemType::Default, InvoiceItemType::Discount];

    protected $touches  = ['company'];
    protected $appends  = ['class', 'icon', 'path', 'params', 'net', 'state', 'has_time_budget'];
    protected $fillable = ['company_id', 'name', 'intro', 'outro', 'description', 'project_id', 'product_id', 'remind_at', 'deadline_at', 'lead_probability', 'project_manager_id'];
    protected $casts    = [
        'net'                      => PrecomputedAuth::class,
        'gross'                    => PrecomputedAuth::class,
        'net_remaining'            => PrecomputedAuth::class,
        'work_estimated'           => Precomputed::class,
        'target_wage'              => Permission::class.':financial',
        'support_net'              => 'float',
        'created_at'               => 'date',
        'updated_at'               => 'date',
        'decision_at'              => 'date',
        'is_ignored_from_prepared' => 'boolean',
    ];
    protected $access = ['admin' => '*', 'project_manager' => 'cru', 'user' => 'cru'];

    protected static function boot(): void {
        parent::boot();
        static::created(function (Project $project) {
            ProjectProjectState::create([
                'project_id'       => $project->id,
                'project_state_id' => 1,
            ]);
        });
    }
    public function newCollection(array $models = []) {
        return new ProjectCollection($models);
    }

    // ######################
    // PRECOMPUTED ATTRIBUTES
    // ######################

    public function precomputeNetAttribute(): float {
        return $this->invoiceItems()->whereIn('type', InvoiceItemType::ProjectTotal)->sum('net');
    }
    public function precomputeGrossAttribute(): float {
        return $this->invoiceItems()->whereIn('type', InvoiceItemType::Total)->sum('gross');
    }
    public function precomputeNetRemainingAttribute(): float {
        if ($this->is_time_based) {
            return $this->invoiceItems()->whereIn('type', InvoiceItemType::ProjectTotalRemaining)->whereNull('invoice_id')->whereNull('company_id')->sum('net');
        }
        return $this->invoiceItems()->whereIn('type', InvoiceItemType::ProjectTotalRemaining)->sum('net');
    }
    public function precomputeWorkEstimatedAttribute(): float {
        return $this->invoiceItems->reduce(fn ($carry, $_) => $carry + $_->assumedWorkload(), 0);
    }

    // #########
    // ACCESSORS
    // #########

    public function getStateAttribute(): ?ProjectState {
        return $this->relationLoaded('states') && $this->states->isNotEmpty()
            ? $this->states->first()
            : $this->states()->first();
    }
    public function setStateAttribute($value) {
        return ProjectProjectState::create([
            'project_id'       => $this->id,
            'project_state_id' => $value,
        ]);
    }
    public function getFinishedAtAttribute() {
        return $this->relationLoaded('lastFinishedStateRelation')
            ? $this->lastFinishedStateRelation?->pivot->created_at
            : $this->lastFinishedState()->first()?->pivot->created_at;
    }
    public function getStartedAtAttribute() {
        return $this->relationLoaded('firstStartedStateRelation')
            ? $this->firstStartedStateRelation?->pivot->created_at
            : $this->firstStartedState()->first()?->pivot->created_at;
    }
    public function getAddresseeAttribute() {
        $mainContact = $this->assignedContacts()
            ->whereRaw('`assignments`.`flags` & ? = ?', [Assignment::FLAG_MAIN_CONTACT, Assignment::FLAG_MAIN_CONTACT])
            ->first();
        return $mainContact ?: $this->assignedContacts()->first();
    }
    public function getTimelineChartAttribute() {
        return (new ProjectTimelineQuery($this))->get();
    }
    public function getDecisionAtAttribute(): ?Carbon {
        return $this->firstDecisionState()->first()?->pivot->created_at;
    }
    public function getSuccessAttribute() {
        return $this->state ? ($this->state->progress == ProjectState::Finished ? 1 : 0) : 0;
    }
    public function getIconAttribute() {
        $company = $this->relationLoaded('company') ? $this->company : $this->company;
        return $company ? $company->icon : '';
    }
    public function getProgressAttribute() {
        return $this->work_estimated > 0 ? $this->hours_invested / $this->work_estimated : 0;
    }
    public function getCompanyNameAttribute() {
        return $this->company?->name ?? '';
    }
    public function getProbabilityAttribute() {
        return abs($this->lead_probability);
    }
    public function getColorAttribute() {
        return $this->state ? $this->state->color : null;
    }
    public function getPersonalizedAttribute() {
        return Document::personalizationArray($this->addressee);
    }
    public function getQuoteAccuracyAttribute() {
        $w = $this->work_estimated;
        return $w > 0 ? $this->hours_invested / $w : 0;
    }
    protected function hasTimeBudget(): Attribute {
        return Attribute::make(
            get: fn () => $this->hasTimeBudgetLogic()
        );
    }
    private function hasTimeBudgetLogic(): bool {
        if ($this->is_time_based) {
            return false;
        }

        if ($this->company_id == Param::get('ME_ID')->value) {
            return false;
        }
        return true;
    }

    // #########
    // RELATIONS
    // #########

    public function comments() {
        return $this->hasManyMorph(Comment::class);
    }
    public function company() {
        return $this->belongsTo(Company::class);
    }
    public function connectionProjects() {
        return $this->hasMany(ConnectionProject::class)->with(['connection.company1', 'connection.company2']);
    }
    public function connections() {
        return $this->hasManyThrough(Connection::class, ConnectionProject::class, 'project_id', 'id', 'id', 'connection_id');
    }
    public function invoiceItemsRaw() {
        return $this->hasMany(InvoiceItem::class)->where('type', '=!', InvoiceItemType::Paydown);
    }
    public function unbilledInvoiceItems() {
        return $this->invoiceItems()->whereNull('invoice_id')->whereNull('company_id')->whereIn('type', InvoiceItemType::ProjectTotalRemaining);
    }
    public function supportItems() {
        return $this->invoiceItems()->whereIn('type', [InvoiceItemType::Default, InvoiceItemType::PreparedSupport])->where('net', '>', 0)->whereInvoiceId(null)->whereCompanyId(null);
    }
    public function milestones() {
        return $this->hasMany(Milestone::class);
    }
    public function parentProject() {
        return $this->belongsTo(Project::class);
    }
    public function pluginLinks() {
        return $this->hasManyMorph(PluginLink::class);
    }
    public function predictions() {
        return $this->hasManyThrough(InvoiceItemPrediction::class, InvoiceItem::class);
    }
    public function preparedInvoiceItems() {
        return $this->invoiceItems()->whereIn('type', [...Invoice::ITEMS_ADDING_TO_INVOICE, InvoiceItemType::Header])->whereInvoiceId(null)->oldest('position');
    }
    public function product() {
        return $this->belongsTo(Product::class);
    }
    public function projectManager() {
        return $this->belongsTo(User::class);
    }
    public function subProjects() {
        return $this->hasMany(Project::class);
    }
    public function companysBaseProjects() {
        return $this->hasManyThrough(Project::class, Company::class, 'id', 'company_id', 'company_id', 'id')->whereNull('project_id');
    }
    public function companysActiveProjects() {
        return $this->hasManyThrough(Project::class, Company::class, 'id', 'company_id', 'company_id', 'id')->wherePreparedOrRunning();
    }
    public function states() {
        return $this->belongsToMany(ProjectState::class)->using(ProjectProjectState::class)->withPivot('id')->withTimestamps()->orderByPivot('id', 'desc');
    }
    public function latestState() {
        return $this->states()->pickLatest('project_project_state', 'project_id', 'id');
    }
    public function lastFinishedState() {
        return $this->states()->where('progress', ProjectState::Finished)->pickLatest('project_project_state', 'project_id', 'id');
    }
    public function lastFinishedSuccessfulState() {
        return $this->states()
            ->where('progress', ProjectState::Finished)
            ->where('is_successful', 1)
            ->where('is_in_stats', 1)
            ->pickLatest('project_project_state', 'project_id', 'id');
    }
    public function firstStartedState() {
        return $this->states()->where('progress', ProjectState::Running)->pickOldest('project_project_state', 'project_id', 'id');
    }
    public function firstDecisionState() {
        return $this->states()
            ->whereIn('progress', [ProjectState::Running, ProjectState::Finished])
            ->pickOldest('project_project_state', 'project_id', 'id');
    }
    public function lastFinishedStateRelation() {
        return $this->hasOneThrough(ProjectState::class, 'project_project_state')
            ->where('progress', ProjectState::Finished)
            ->latest('project_project_state.id');
    }
    public function firstStartedStateRelation() {
        return $this->hasOneThrough(ProjectState::class, 'project_project_state')
            ->where('progress', ProjectState::Running)
            ->oldest('project_project_state.id');
    }
    public function uptimeMonitors() {
        return $this->belongsToMany(UptimeMonitor::class, 'project_uptime_monitor')
            ->using(ProjectUptimeMonitor::class)
            ->withTimestamps();
    }
    public function debriefs() {
        return $this->hasMany(DebriefProjectDebrief::class);
    }
    public function getWage($baseWage = null) {
        if ($this->individual_wage !== null) {
            return $this->individual_wage;
        }
        return $this->company->getWage($baseWage);
    }
    public function newEloquentBuilder($query) {
        return new ProjectBuilder($query);
    }
}
