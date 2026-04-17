<?php

namespace App\Models;

use App\Actions\GenerateProjectQuoteAction;
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
use App\Traits\HasPaymentPlanTrait;
use App\Traits\HasProjectStateTrait;
use App\Traits\HasQuoteDescriptionsTrait;
use App\Traits\HasTasksTrait;
use App\Traits\PrecomputedTrait;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Http\Response;

class Project extends BaseModel {
    public static function withParentHierarchy($collection): ProjectCollection {
        $allProjects = collect();
        foreach ($collection as $project) {
            $allProjects->push($project);
            $parentId = $project->project_id;
            while ($parentId) {
                $parent = static::find($parentId);
                if ($parent) {
                    $allProjects->push($parent);
                    $parentId = $parent->project_id;
                } else {
                    $parentId = null;
                }
            }
        }
        return new ProjectCollection($allProjects->unique('id')->values()->all());
    }

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
    public function makeQuote(): Response {
        return app(GenerateProjectQuoteAction::class)->execute($this);
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
        return $this->invoiceItems()->whereStage(1)->whereIn('type', InvoiceItemType::TotalRemaining)->where('net', '>', 0)->whereInvoiceId(null)->whereCompanyId(null);
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
        return $this->invoiceItems()->whereStage(0)->whereIn('type', [...Invoice::ITEMS_ADDING_TO_INVOICE, InvoiceItemType::Header])->whereInvoiceId(null)->oldest('position');
    }
    public function supportInvoiceItems() {
        return $this->invoiceItems()->whereStage(1)->whereIn('type', [...Invoice::ITEMS_ADDING_TO_INVOICE, InvoiceItemType::Header])->whereInvoiceId(null)->oldest('position');
    }
    public function downpaymentInvoiceItems() {
        return $this->invoiceItems()->whereStage(2)->whereIn('type', [...Invoice::ITEMS_ADDING_TO_INVOICE, InvoiceItemType::Header])->whereInvoiceId(null)->oldest('position');
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
    public function postpone(int $duration, ?string $comment = null): static {
        $map = [
            1 => ['period' => 'weeks',  'amount' => 1,  'label' => '1 Wochen'],
            2 => ['period' => 'weeks',  'amount' => 2,  'label' => '2 Wochen'],
            3 => ['period' => 'months', 'amount' => 1,  'label' => '1 Monate'],
            4 => ['period' => 'months', 'amount' => 2,  'label' => '2 Monate'],
            5 => ['period' => 'months', 'amount' => 3,  'label' => '3 Monate'],
            6 => ['period' => 'months', 'amount' => 6,  'label' => '6 Monate'],
            7 => ['period' => 'months', 'amount' => 12, 'label' => '1 Jahr'],
        ];
        $config = $map[$duration] ?? null;
        if (! $config) {
            return $this;
        }
        $method           = 'add'.ucfirst($config['period']);
        $this->remind_at  = now()->$method($config['amount'])->toDateTimeString();
        $this->save();

        $text = ($comment ? $comment.'<br>' : '').'Frist verlängert ('.$config['label'].')';
        Comment::create([
            ...$this->toPoly(),
            'text'    => $text,
            'user_id' => request()->user()->id,
            'is_mini' => true,
        ]);
        return $this;
    }
    public function setParent(?int $parentId): void {
        if ($this->pluginLinks) {
            $this->pluginLinks->each(fn ($_) => $_->delete());
        }
        $this->assignees()->delete();

        if ($parentId) {
            $parent = Project::findOrFail($parentId);
            foreach ($parent->assignees()->get() as $assignee) {
                Assignment::firstOrCreate([
                    ...$this->toPoly(),
                    ...$assignee->assignee->toPoly('assignee'),
                    'role_id' => $assignee->role_id,
                ]);
            }
            foreach ($parent->pluginLinks()->get() as $link) {
                PluginLink::firstOrCreate([
                    'name' => $link->name,
                    'type' => $link->type,
                    'url'  => $link->url,
                    ...$this->toPoly(),
                ]);
            }
            $this->project_manager_id = $parent->project_manager_id;
            $this->product_id         = $parent->product_id;
        } else {
            $this->project_manager_id = null;
            $this->product_id         = null;
        }
    }
    public function moveItemsToCustomer($itemsQuery, array $itemUpdates = []): void {
        Invoice::disablePropagation();

        $maxPos = $this->company->invoiceItems()->max('position') ?? 0;

        InvoiceItem::create([
            'company_id' => $this->company->id,
            'position'   => ++$maxPos,
            'type'       => InvoiceItemType::Header,
            'text'       => ($this->po_number ? $this->po_number.' ' : '').$this->name,
        ]);

        $itemsQuery->get()->each(function ($item) use (&$maxPos, $itemUpdates) {
            $item->update([
                'company_id' => $this->company_id,
                'position'   => ++$maxPos,
                ...$itemUpdates,
            ]);
        });

        Invoice::enablePropagation();
        $this->propagateDirty();
    }
    public function newEloquentBuilder($query) {
        return new ProjectBuilder($query);
    }
}
