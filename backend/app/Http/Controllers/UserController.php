<?php

namespace App\Http\Controllers;

use App\Actions\User\CalculateDailyWorkload;
use App\Enums\CommentType;
use App\Enums\InvoiceItemType;
use App\Enums\InvoiceVatHandling;
use App\Helpers\ModelRelationship;
use App\Http\Middleware\Auth;
use App\Models\Company;
use App\Models\LeadSource;
use App\Models\Param;
use App\Models\ProjectState;
use App\Models\User;
use App\Models\UserEmployment;
use App\Models\UserPaidTime;
use App\Models\Vault;
use App\Traits\ControllerHasPermissionsTrait;
use App\Traits\HasParams;
use Carbon\CarbonPeriod;
use Exception;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class UserController extends Controller {
    const ERROR_404   = 'email not found or password incorrect';
    const ERROR_TOKEN = 'Invalid api_token';

    protected $exceptedMiddlewares = ['showEnvironment', 'login'];

    use ControllerHasPermissionsTrait;

    public function index(Request $request) {

        return User::get()
            ->map(function ($user) {
                $user['hr_stress'] = round(100 * $user->foci()->where('created_at', '>', now()->subWeeks(2))->sum('duration') / 80);
                return $user;
            })
            ->sortBy('is_retired')
            ->sortByDesc('hr_stress')->values();
    }
    public function store(Request $request) {
        $request->validate([
            'name'                  => 'required_without_all:first_name,family_name|nullable|string|max:255',
            'first_name'            => 'sometimes|nullable|string|max:255',
            'family_name'           => 'sometimes|nullable|string|max:255',
            'email'                 => 'required|email|unique:users,email',
            'password'              => 'required|string|min:8',
            'employment.type'       => 'sometimes|string',
            'employment.hpw'        => 'sometimes|numeric',
            'employment.started_at' => 'sometimes|date',
        ]);

        $firstName  = $request->input('first_name', '');
        $familyName = $request->input('family_name', '');

        if (! $firstName && ! $familyName && $request->name) {
            $parts      = explode(' ', $request->name, 2);
            $firstName  = $parts[0];
            $familyName = $parts[1] ?? '';
        }

        $fullName = trim($firstName . ' ' . $familyName) ?: $request->name;

        $vcard = new \App\Models\Vcard();
        $vcard->setProperty('FN', $fullName);
        $vcard->setProperty('N', [$familyName, $firstName, '', '', ''], ['charset' => 'utf-8']);
        $vcard->setProperty('EMAIL', $request->email, ['type' => 'work']);

        $user = User::create([
            'name'      => $fullName,
            'email'     => $request->email,
            'password'  => Hash::make($request->password),
            'api_token' => Str::random(60),
            'vcard'     => $vcard->toVCardString(false),
        ]);

        if ($request->has('employment')) {
            $emp        = $request->input('employment');
            $type       = $emp['type'] ?? 'Festanstellung';
            $hpw        = (float) ($emp['hpw'] ?? 40);
            $hpd        = $hpw / 5;
            $start      = $emp['started_at'] ?? now()->format('Y-m-d');
            $timeBased  = ['Werkstudent'];

            UserEmployment::create([
                'user_id'       => $user->id,
                'description'   => $type,
                'mo'            => $hpd,
                'tu'            => $hpd,
                'we'            => $hpd,
                'th'            => $hpd,
                'fr'            => $hpd,
                'sa'            => 0,
                'su'            => 0,
                'is_time_based' => in_array($type, $timeBased),
                'started_at'    => $start,
                'is_active'     => true,
            ]);
        }

        return $user;
    }
    public function indexFoci(Request $request, User $_) {
        return $_->foci()->with('parent', 'invoiceItem')->latest('started_at')->paginate(100)->withQueryString();
    }
    public function indexPmMilestones(Request $request, User $_) {
        $result = $this->indexMilestones($request, $_, true);

        // Also include projects without milestone coverage (PM-specific)
        $meId = Param::get('ME_ID')->value;

        $projectsNoCoverage = \App\Models\Project::whereRunning()
            ->where('project_manager_id', $_->id)
            ->where('is_time_based', false)
            ->where('company_id', '!=', $meId)
            ->with([
                'company',
                'milestones' => function ($q) {
                    $q->select('id', 'project_id', 'workload_hours')
                        ->with('invoiceItems:id,company_id,project_id,net,type,unit_name,qty');
                },
            ])
            ->get()
            ->filter(function ($project) {
                $milestoneHours = $project->milestones->sum(function ($milestone) {
                    if ($milestone->workload_hours !== null && $milestone->workload_hours > 0) {
                        return $milestone->workload_hours;
                    }
                    return $milestone->invoiceItems->sum(fn ($item) => $item->assumedWorkload());
                });

                return $milestoneHours <= 0;
            })
            ->map(function ($project) {
                return [
                    'id'              => $project->id,
                    'name'            => $project->name,
                    'icon'            => $project->icon,
                    'company_id'      => $project->company_id,
                    'company_name'    => $project->company->name ?? '',
                    'estimated_hours' => round($project->work_estimated ?? 0, 1),
                    'milestone_count' => $project->milestones->count(),
                ];
            })
            ->values();

        return [
            'milestones'           => $result,
            'projects_no_coverage' => $projectsNoCoverage,
        ];
    }
    public function indexMilestones(Request $request, User $_, bool $pm = false) {
        if ($pm) {
            $milestonesGrouped = \App\Models\Milestone::whereHas('project', fn ($query) => $query->where('project_manager_id', $_->id)->whereRunning());
        } else {
            $milestonesGrouped = $_->milestones()->whereHas('project', fn ($q) => $q->whereRunning());
        }

        $milestonesGrouped = $milestonesGrouped
            ->with([
                'project' => function ($q) {
                    $q->with([
                        'assignees' => function ($q2) {
                            $q2->with('assignee');
                        },
                        'company',
                    ]);
                },
                'tasks',
                'dependees',
                'dependants',
                'invoiceItems:id,company_id,project_id,net',
                'user:id,name',
            ])
            ->orderBy('position')
            ->get()
            ->groupBy('project_id');

        $projectIds   = $milestonesGrouped->keys();
        $milestoneIds = $milestonesGrouped->flatten(1)->pluck('id');

        // Optimize task queries with joins instead of whereExists
        $projectTasksGrouped = \App\Models\Task::where('parent_type', 'App\\Models\\Project')
            ->whereIn('parent_id', $projectIds)
            ->with('assignee.assignee')
            ->get()
            ->groupBy('parent_id');

        $milestoneTasksGrouped = \App\Models\Task::where('parent_type', 'App\\Models\\Milestone')
            ->whereIn('parent_id', $milestoneIds)
            ->with('assignee.assignee')
            ->get()
            ->groupBy('parent_id');

        return $milestonesGrouped->map(function ($milestones, $projectId) use ($projectTasksGrouped, $milestoneTasksGrouped) {
            $project      = $milestones->first()->project;
            $projectTasks = $projectTasksGrouped->get($projectId, collect());

            $milestonesWithTasks = $milestones->map(fn ($milestone) => [
                'milestone' => $milestone,
                'tasks'     => $milestoneTasksGrouped->get($milestone->id, collect()),
            ]);

            return [
                'project'       => $project,
                'project_tasks' => $projectTasks,
                'milestones'    => $milestonesWithTasks->values(),
            ];
        })->values();
    }
    public function update(Request $request, User $user) {
        $isOwnProfile = $request->user()->id === $user->id;

        if (! $isOwnProfile && ! $request->user()->hasRole('hr')) {
            abort(403, 'Unauthorized');
        }

        if ($request->has('is_retired') && Auth::user()->hasAnyRole(['admin', 'hr'])) {
            $user->employments->each(function ($_) {
                $_->is_active = false;
                $_->save();
            });
            $user->syncRoles([]);
            return $user;
        }
        if ($request->has('hpw') && Auth::user()->hasAnyRole(['admin', 'hr'])) {
            $days       = ['mo', 'tu', 'we', 'th', 'fr', 'sa', 'su'];
            $validation = array_merge(...array_map(fn ($_): array => ["hpw.$_" => 'required|numeric'], $days));
            $request->validate($validation);
            $validated  = $request->only(array_keys($validation));
            $employment = $user->activeEmployment;
            $employment->fill($validated['hpw']);
            $employment->save();
        }
        if ($request->has('user_group') && Auth::user()->hasAnyRole(['admin', 'hr'])) {
            $request->validate([
                'user_group' => 'nullable|in:admin,project_manager,user,guest,invoicing,financial,marketing,hr,product_manager',
            ]);
            $roles = $request->get('user_group', []);
            $user->syncRoles($roles);
            return $user;
        }
        $user->applyAndSave($request);
        $user->load('activeEmployment');
        return $user;
    }
    public function show(User $user) {
        return $user->load('activeEmployment');
    }
    public function login(Request $request) {
        if ($request->hasHeader('Authorization')) {
            $token = preg_replace('/^Bearer /is', '', $request->header('Authorization'));
            if (strlen($token) === 0) {
                return response()->make(self::ERROR_TOKEN, 403);
            }
            try {
                $user = User::where('api_token', $token)->firstOrFail();
            } catch (Exception $ex) {
                return response()->make(self::ERROR_TOKEN, 403);
            }
            Auth::setUser($user);
            $user->makeVisible('api_token');
            return $this->showEnvironment();
        } else {
            $data = json_decode($request->getContent());
            if (empty($data->email)) {
                return response()->make('Login not set', 403);
            }
            if (empty($data->password)) {
                return response()->make('Password not set', 403);
            }
            try {
                $user = User::where('email', $data->email)->firstOrFail();
            } catch (Exception $ex) {
                return response()->make(self::ERROR_404, 403);
            }
            if (! Hash::check($data->password, $user->password)) {
                return response()->make(self::ERROR_404, 403);
            }
            Auth::setUser($user);
            $user->api_token = Str::random(60);
            $user->save();
            $user->makeVisible('api_token');
            return $this->showEnvironment();
        }
    }
    public function showEnvironment() {
        $user = Auth::user()->load('activeEmployment', ...HasParams::$WITH)->append(['role_names', 'params']);

        $team = User::with(['encryptions', 'activeEmployment'])
            ->get()
            ->sortBy('is_retired')
            ->map(function ($user) {
                if (! $user->is_retired) {
                    $user->encryptions->each(fn ($e) => $e->makeHidden(['value', 'created_at', 'updated_at', 'flags']));
                }
                $user->append('role_names');

                // Add bias factor to user data
                $biasFactor = $user->param('STATS_PREDICTION_BIAS')->value ?? null;
                $user->setAttribute('bias_factor', $biasFactor);
                return $user;
            });

        // Batch load remaining data efficiently
        $leadSources   = LeadSource::all();
        $projectStates = ProjectState::all();
        $plugins       = Vault::indexVaults()->filter(fn ($_) => $_['active']);

        // Get roles if user has permission
        $roles = [];
        if ($user->hasRole('admin')) {
            $roleController = new \App\Http\Controllers\RoleController;
            $rolesData      = $roleController->index();
            $roles          = $rolesData['roles'] ?? [];
        }

        $object = collect([
            'version'                 => 1,
            'user'                    => $user,
            'dashboards'              => $user->getDashboards(),
            'encryptions'             => $user->encryptions,
            'eu_countries'            => $this->getCachedEuCountries(),
            'lead_sources'            => $leadSources,
            'team'                    => $team,
            'settings'                => Param::index(),
            'tables'                  => $this->getCachedTables(),
            'relations'               => ModelRelationship::RELATIONSHIPS,
            'accessors'               => ModelRelationship::ACCESSORS,
            'project_states'          => $projectStates,
            'plugins'                 => $plugins,
            'enums'                   => $this->getCachedEnums(),
            'roles'                   => $roles,
        ]);
        return $object;
    }
    public function getTables() {
        $database       = config('database.connections.mysql.database');
        $excludedTables = ['sentinel_triggers', 'sentinel_users', 'failed_jobs', 'role_has_permissions', 'migrations', 'milestone_milestones', 'float_params', 'string_params', 'text_params', 'password_resets', 'translations', 'model_has_permissions', 'model_has_roles', 'permissions', 'roles', 'role_has_permission'];

        // Build excluded tables clause with proper parameter binding
        $excludePlaceholders = implode(',', array_fill(0, count($excludedTables), '?'));

        // Get all tables and their columns in a single query using INFORMATION_SCHEMA
        $tablesWithColumns = DB::select("
            SELECT
                t.TABLE_NAME as table_name,
                c.COLUMN_NAME as Field,
                c.DATA_TYPE as Type,
                c.IS_NULLABLE as `Null`,
                c.COLUMN_KEY as `Key`,
                c.COLUMN_DEFAULT as `Default`,
                c.EXTRA as Extra
            FROM INFORMATION_SCHEMA.TABLES t
            LEFT JOIN INFORMATION_SCHEMA.COLUMNS c ON t.TABLE_NAME = c.TABLE_NAME AND t.TABLE_SCHEMA = c.TABLE_SCHEMA
            WHERE t.TABLE_SCHEMA = ?
            AND t.TABLE_TYPE = 'BASE TABLE'
            AND t.TABLE_NAME NOT IN ({$excludePlaceholders})
            ORDER BY t.TABLE_NAME, c.ORDINAL_POSITION
        ", array_merge([$database], $excludedTables));

        // Group columns by table
        $tables       = [];
        $currentTable = null;

        foreach ($tablesWithColumns as $row) {
            if ($currentTable !== $row->table_name) {
                if ($currentTable !== null) {
                    // Add mutator columns for previous table if model exists
                    $this->addMutatorColumns($tables[count($tables) - 1]);
                }

                $tables[] = [
                    'name'    => $row->table_name,
                    'columns' => [],
                ];
                $currentTable = $row->table_name;
            }

            if ($row->Field) { // Only add if column data exists
                $tables[count($tables) - 1]['columns'][] = [
                    'Field'   => $row->Field,
                    'Type'    => $row->Type,
                    'Null'    => $row->Null,
                    'Key'     => $row->Key,
                    'Default' => $row->Default,
                    'Extra'   => $row->Extra,
                ];
            }
        }

        // Handle last table's mutators
        if (! empty($tables)) {
            $this->addMutatorColumns($tables[count($tables) - 1]);
        }
        return $tables;
    }
    private function addMutatorColumns(&$tableNode) {
        $model = '\\App\\Models\\'.Str::studly(Str::singular($tableNode['name']));
        if (class_exists($model)) {
            $o = new $model;
            if (method_exists($o, 'getMutators')) {
                foreach (@$o->getMutators() as $t) {
                    $tableNode['columns'][] = ['Field' => $t, 'Type' => 'int'];
                }
            }
        }
    }
    private function getCachedTables() {
        return $this->getTables();
    }
    private function getCachedEuCountries() {
        return collect(config('eu.countries'));
    }
    private function getCachedEnums() {
        return collect([
            $this->enumClass(InvoiceItemType::class)    => InvoiceItemType::asArray(),
            $this->enumClass(InvoiceVatHandling::class) => InvoiceVatHandling::asArray(),
            $this->enumClass(CommentType::class)        => CommentType::asArray(),
        ]);
    }
    public function destroy(User $user) {
        if (! Auth::user()->hasRole('admin')) {
            abort(403, 'Unauthorized');
        }
        $user->delete();
        return response()->noContent();
    }
    public function resetPassword(Request $request, User $user) {
        $request->validate([
            'password' => 'required|string|min:8',
        ]);
        $user->password = Hash::make($request->password);
        $user->save();
        return response()->noContent();
    }
    public function storeEmployment() {
        request()->validate([
            'user_id'       => 'exists:App\Models\User,id',
            'mo'            => 'required|numeric',
            'tu'            => 'required|numeric',
            'we'            => 'required|numeric',
            'th'            => 'required|numeric',
            'fr'            => 'required|numeric',
            'sa'            => 'required|numeric',
            'su'            => 'required|numeric',
            'is_time_based' => 'required|boolean',
            'started_at'    => 'required|date',
        ]);
        return UserEmployment::create((array)$this->getBody());
    }
    public function updateEmployment(User $_, UserEmployment $id) {
        return $id->applyAndSaveRequest();
    }
    public function deleteEmployment(User $_, UserEmployment $id) {
        return $id->delete();
    }
    public function enumClass($string) {
        return substr($string, strrpos($string, '\\') + 1);
    }
    public function showTimeBasedEmploymentInfo(User $_) {
        $_->employments;
        $_->tbe_projects = $_->getTimeBasedEmploymentInfo();
        $_->tbe_table    = $_->getTimeBasedEmploymentTable();
        $_->roles        = $_->getRoleNames();
        return $_;
    }
    public function showFoci30D(User $_) {
        return $_->foci()
            ->selectRaw('parent_id, parent_type, SUM(duration) AS duration')
            ->groupBy('parent_id')
            ->groupBy('parent_type')
            ->with('parent')
            ->whereAfter(now()->startOfDay()->subDays(30))
            ->get();
    }
    public function createTbe(User $_) {
        request()->validate([
            'paid_at'  => 'required|date',
            'raw'      => 'required|numeric',
            'vacation' => 'required|numeric',
        ]);
        $data = $this->getBody();
        return UserPaidTime::create([
            'paid_at'            => $data->paid_at,
            'user_id'            => $_->id,
            'granted_by_user_id' => request()->user()->id,
            'raw'                => $data->raw,
            'description'        => 'Bezahlte Zeit '.$data->paid_at,
            'vacation'           => $data->vacation,
        ]);
    }
    public function generateTimeline(User $user, $plannedSubscriptions = null, $remainingHpw = 40, $withoutSubscriptions = false) {
        $totalDays           = 60;
        $dailyAvailable      = $remainingHpw / 7;
        $totalAvailableHours = $dailyAvailable * $totalDays;

        $today         = now()->startOfDay();
        $endDate       = $today->copy()->addDays($totalDays);
        $currentOffset = 0;

        // Create map of break days
        $breakMap = collect();

        $approvedVacations = $user->approvedVacations(now()->subDays(90), now()->addMonths(3))->get();
        $currentSickNotes  = $user->currentSickNotes(now()->subDays(90), now()->addMonths(3))->get();

        $holidays = app(VacationController::class)->indexHolidays($user->work_zip ?? '87435');
        foreach ($holidays as $holiday) {
            $day                             = Carbon::parse($holiday->datum);
            $breakMap[$day->format('Y-m-d')] = ['holiday', $holiday->name];
        }

        foreach ($approvedVacations as $vac) {
            $period = CarbonPeriod::create($vac->started_at, $vac->ended_at);
            foreach ($period as $date) {
                $name                             = "$vac->comment [".$vac->started_at->format('Y-m-d').' - '.$vac->ended_at->format('Y-m-d').']';
                $breakMap[$date->format('Y-m-d')] = ['vacation', $name];
            }
        }

        foreach ($currentSickNotes as $sick) {
            $period = CarbonPeriod::create($sick->started_at, $sick->ended_at);
            foreach ($period as $date) {
                $breakMap[$date->format('Y-m-d')] = ['sick', 'sick note'];
            }
        }

        $subsQueue = $plannedSubscriptions ? $plannedSubscriptions->map(fn ($s) => ['id' => $s->id, 'class'=>$s->class, 'name'=>$s->name, 'hours' => $s->pivot->hours_planned])->values() : collect();

        // Build timeline per day
        $timeline   = [];
        $currentDay = 0;

        while ($today->lt($endDate)) {
            $dateStr = $today->format('Y-m-d');
            $isBreak = isset($breakMap[$dateStr]);

            if ($isBreak) {
                if ($withoutSubscriptions) {
                    // For leaves-only mode, use calendar-based positioning
                    $timeline[] = [
                        'type'  => $breakMap[$dateStr][0],
                        'id'    => 0,
                        'left'  => round($currentDay / $totalDays, 4),
                        'width' => round(1 / $totalDays, 4),
                        'days'  => 1,
                        'name'  => $breakMap[$dateStr][1],
                    ];
                } else {
                    // For full timeline mode, use hours-based positioning
                    $timeline[] = [
                        'type'  => $breakMap[$dateStr][0],
                        'id'    => 0,
                        'left'  => round($currentOffset / $totalAvailableHours, 4),
                        'width' => round($dailyAvailable / $totalAvailableHours, 4),
                        'days'  => 1,
                        'name'  => $breakMap[$dateStr][1],
                    ];
                    $currentOffset += $dailyAvailable;
                }
            } elseif (! $withoutSubscriptions && $subsQueue->isNotEmpty()) {
                $current     = $subsQueue->first();
                $hoursToPlan = min($dailyAvailable, $current['hours']);
                $timeline[]  = [
                    'type'  => $current['class'],
                    'id'    => $current['id'],
                    'left'  => round($currentOffset / $totalAvailableHours, 4),
                    'width' => round($hoursToPlan / $totalAvailableHours, 4),
                    'name'  => $current['name'],
                    'days'  => 1,
                ];

                $currentOffset += $hoursToPlan;
                $current['hours'] -= $hoursToPlan;
                if ($current['hours'] <= 0) {
                    $subsQueue->shift();
                } else {
                    $subsQueue->put(0, $current);
                }
            } elseif (! $withoutSubscriptions) {
                $currentOffset += $dailyAvailable;
            }

            $currentDay++;
            $today->addDay();
        }

        // merge blocks
        $grouped = [];
        $prev    = null;
        foreach ($timeline as $item) {
            if ($prev && $item['type'] === $prev['type'] && $item['id'] === $prev['id'] && (abs($prev['left'] + $prev['width'] - $item['left']) < 0.001)) {
                $prev['width'] += $item['width'];
                $prev['days']++;
            } else {
                if ($prev) {
                    $grouped[] = $prev;
                }
                $prev = $item;
            }
        }
        if ($prev) {
            $grouped[] = $prev;
        }
        return $grouped;
    }
    public function indexProjectLoad(User $_) {
        $user = $_;

        $meId      = Param::get('ME_ID')->value;
        $meCompany = Company::find($meId);

        // auto-assign own company as service company (so orga is shown in timetracker)
        if ($meCompany && ! $user->assigned_companies()->where('companies.id', $meId)->exists()) {
            $meCompany->addAssignee($user);
        }

        // computation
        $ae = $user->activeEmployment;
        if (! $ae) {
            return response('user has no active employment', 404);
        }

        $activeSubscriptions  = collect([...$user->activeProjects()->with('company')->get(), ...$user->assigned_companies()->get()])->unique();

        // Load avg_hpd accessor for each subscription's assignment
        $activeSubscriptions->each(function ($subscription) {
            if ($subscription->pivot && $subscription->pivot->id) {
                $assignment = \App\Models\Assignment::find($subscription->pivot->id);
                if ($assignment) {
                    $subscription->pivot->avg_hpd = $assignment->avg_hpd;
                }
            }
        });

        $weeklySubscriptions  = $activeSubscriptions->filter(fn ($_) => $_->pivot->hours_weekly > 0);
        $plannedSubscriptions = $activeSubscriptions->filter(fn ($_) => $_->pivot->hours_planned > 0);
        $weeklyHpw            = $weeklySubscriptions->reduce(fn ($a, $b) => $a + $b->pivot->hours_weekly, 0);
        $remainingHpw         = $ae->hpw - $weeklyHpw;

        // Generate leaves independently of subscriptions
        $timeline_leaves = $this->generateTimeline($user, null, 40, true);

        if ($remainingHpw > 0) {
            $timeline         = $this->generateTimeline($user, $plannedSubscriptions, $remainingHpw);
            $timeline_planned = array_values(array_filter($timeline, fn ($_) => $_['type'] == 'Project' || $_['type'] == 'Company'));
        } else {
            $timeline_planned = [];
        }

        // hours_weekly, hours_planned
        $data = [
            'user'             => $user,
            'hpw'              => $ae->hpw,
            'remaining_hpw'    => $remainingHpw,
            'subscriptions'    => $activeSubscriptions,
            'weekly_ids'       => $weeklySubscriptions->map(fn ($_) => ['type'=>$_->class, 'id'=>$_->id])->values(),
            'timeline_planned' => $timeline_planned,
            'timeline_leaves'  => $timeline_leaves,
        ];
        return $data;
    }
    public function indexDailyWorkload(Request $request, User $_) {
        $startDate = $request->has('start')
            ? Carbon::parse($request->get('start'))->startOfDay()
            : now()->startOfDay();

        $endDate = $request->has('end')
            ? Carbon::parse($request->get('end'))->endOfDay()
            : now()->addMonths(3)->endOfDay();

        return app(CalculateDailyWorkload::class)->execute($_, $startDate, $endDate);
    }
}
