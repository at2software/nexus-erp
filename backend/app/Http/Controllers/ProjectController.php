<?php

namespace App\Http\Controllers;

use App\Http\Controllers\Traits\HasFociController;
use App\Models\Assignment;
use App\Models\Company;
use App\Models\Connection;
use App\Models\ConnectionProject;
use App\Models\Framework;
use App\Models\InvoiceItem;
use App\Models\PluginLink;
use App\Models\Project;
use App\Models\ProjectState;
use App\Models\Task;
use App\Traits\ControllerHasPermissionsTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProjectController extends Controller {
    use ControllerHasPermissionsTrait, HasFociController;

    public function _index($request, $builder) {
        $requestedStates = $request->has('states') ? explode(',', $request->states) : null;
        unset($request['states']);

        $query = $builder->whereRequest()->withRequest();
        if (request('only-mine') === 'true') {
            $query->whereHas('myAssignment');
        }
        if (request('only-mine-as-pm') === 'true') {
            $query->where('project_manager_id', request()->user()->id);
        }
        if (request('missing_project_manager') === 'true') {
            $query->whereNull('project_manager_id');
        }
        if ($requestedStates) {
            $query->whereStateIn($requestedStates);
        }
        if ($request->has('created_at')) {
            $query->whereBetweenString($request->created_at);
        }
        if ($request->has('started_at')) {
            $query->whereHas('firstStartedState', fn ($q) => $q->whereBetweenString($request->started_at, 'project_project_state.created_at'));
        }
        if ($request->has('finished_at')) {
            $query->whereHas('lastFinishedState', fn ($q) => $q->whereBetweenString($request->finished_at, 'project_project_state.created_at'));
        }
        if ($request->has('budget_min')) {
            $query->where('net', '>=', $request->budget_min);
        }
        if ($request->has('assignee_id')) {
            $query->whereHas('assignees', fn ($q) => $q->where('assignee_id', $request->assignee_id)->where('assignee_type', 'App\Models\User'));
        }
        if ($request->has('project_manager_id')) {
            $query->where('project_manager_id', $request->project_manager_id);
        }
        $request['states'] = is_array($requestedStates) ? implode(',', $requestedStates) : $requestedStates;

        if ($request->has('sort_by') && $request->has('sort_direction')) {
            $query->orderBy($request->sort_by, $request->sort_direction);
        } else {
            $query->latest()->latest('net');
        }
        $query->with([
            'company',
            'hoursInvestedSum',
            'connectionProjects',
        ])->withLatestParams();

        if (@request('paginate') === 'true') {
            $replies = $query->paginate(50);
            $replies->withQueryString();
            $replies->setCollection($replies->getCollection()->appendProjectCollection());
        } else {
            $replies = $query->get();
            if ($request->has('withParents') && $request->withParents == true) {
                $replies = Project::withParentHierarchy($replies);
            }
            $replies = $replies->appendProjectCollection();
        }
        return $replies;
    }
    public function index(Request $request) {
        return $this->_index($request, Project::select());
    }
    public function indexForCompany(Request $request, Company $_) {
        return $this->_index($request, $_->projects());
    }
    public function indexCoParticipatedProjects(Request $request, Company $_) {
        $builder = Project::whereHas('connectionProjects', fn ($q) => $q->whereHas('connection', fn ($c) => $c->where('company1_id', $_->id)->orWhere('company2_id', $_->id)
        )
        )->where('company_id', '!=', $_->id);
        return $this->_index($request, $builder);
    }
    public function indexAssignees(Request $request, Project $_) {
        return $_->assignees()->latest('role_id')->with('assignee');
    }
    public function indexComments(Request $request, Project $_) {
        return $_->comments;
    }
    public function indexInvoiceItems(Request $request, Project $_) {
        $query = $_->indexedItems()->withRequest();

        if ($request->boolean('support_only')) {
            return $query->whereNull('company_id')->whereNull('invoice_id')->get()->appendRequest();
        }

        $items = $query->withCount('billedFoci')->withSum('billedFoci', 'duration')->get();
        $items->appendRequest();
        $items->append(['progress']);
        return $items;
    }
    public function indexQuoteDescriptions(Project $_) {
        return $_->getQuoteDescriptions();
    }
    public function indexFoci(Request $request, Project $_) {
        return $this->_indexFoci($request, $_);
    }
    public function indexConnectionProjects(Request $request, Project $_) {
        return $_->connectionProjects()->get()->mapSimplified($_);
    }
    public function storeConnectionProject(Request $request, Project $_) {
        $validated = $request->validate([
            'connection_id' => 'required|exists:connections,id',
        ]);

        $connectionProject = ConnectionProject::create([
            'project_id'    => $_->id,
            'connection_id' => $validated['connection_id'],
        ]);
        return $connectionProject->load(['connection.company1', 'connection.company2']);
    }
    public function destroyConnectionProject(Request $request, Project $_, ConnectionProject $connectionProject) {
        if ($connectionProject->project_id !== $_->id) {
            return response()->json(['error' => 'ConnectionProject does not belong to this project'], 403);
        }

        $connectionProject->delete();
        return response()->json(['success' => true]);
    }
    public function makeInvoice(Project $_) {
        return $_->makeInvoiceFor();
    }
    public function moveSupportToCustomer(Project $_) {
        $_->moveItemsToCustomer($_->invoiceItems()->whereStage(1), ['stage' => 0]);
        return true;
    }
    public function moveRegularItemsToCustomer(Project $_) {
        $_->moveItemsToCustomer($_->invoiceItems()->orderBy('position'));
        return true;
    }
    public function update(Request $request, Project $project) {
        $request->validate([
            'state' => 'nullable|exists:project_states,id',
        ]);

        $previousState = $project->state;

        $project->applyAndSave($request);
        if ($request->has('state')) {
            $project->state = $request->state;
            $project        = $project->fresh('states');
        }

        if ($project->hasStateChangedTo(ProjectState::Prepared, $previousState)) {
            if (request()->user()->hasAnyRole(['admin', 'invoicing'])) {
                return;
            }
        }

        if ($request->has('state') && $project->state->progress !== $previousState->progress) {
            $project->handleStateTransition($previousState, $request->user()->id);
        }

        if ($request->has('project_id')) {
            $project->setParent($request->project_id);
            $project->save();
        }

        return $project;
    }
    public function destroy(Request $request, Project $project) {
        return $project->delete();
    }
    public function postpone(Project $_) {
        request()->validate([
            'duration' => 'required|numeric|in:1,2,3,4,5,6,7',
            'comment'  => 'sometimes|nullable|string',
        ]);
        return $_->postpone(request('duration'), request('comment'));
    }
    public function showReporting(Request $request) {
        $startDate = $request->input('start_date');
        $endDate   = $request->input('end_date');

        // Projects created in date range
        $createdQuery     = Project::whereBetween('created_at', [$startDate, $endDate]);
        $stateChangeQuery = Project::whereHas('states', fn ($q) => $q->whereBetween('project_project_state.created_at', [$startDate, $endDate]));

        $union = $createdQuery->union($stateChangeQuery);
        return $union->with(['company', 'states' => fn ($q) => $q->orderBy('project_project_state.created_at', 'asc')])
            ->orderBy('company_id', 'asc')
            ->orderBy('created_at', 'desc')
            ->get()->unique()->values();
    }
    public function show(Request $request, Project $project) {
        $project->load([
            'assignees.assignee',
            'company.employees',
            'connectionProjects.connection.company1.employees',
            'connectionProjects.connection.company2.employees',
            'pluginLinks',
            'hoursInvestedSum',
            'files',
            'projectManager',
            'product.invoiceItems',
            'companysActiveProjects:projects.id,name,company_id,is_time_based,is_internal',
            'companysBaseProjects:projects.id,name,company_id,is_time_based,is_internal',
            'states' => fn ($q) => $q->latest('pivot_id')->limit(1),
        ]);

        $project->setRelation('invoiceItems', $project->indexedItems()
            ->with([
                'predictions',
                'milestones' => fn ($q) => $q->select('milestones.id', 'invoice_item_id', 'name', 'progress', 'state', 'flags', 'user_id')->without('invoiceItem'),
                'milestones.user:id,name,color',
            ])
            ->withCount('billedFoci')
            ->withSum('billedFoci', 'duration')
            ->get()
        );

        // Add other_company to each connectionProject for easy access to participating company employees
        $project->connectionProjects->each(function ($cp) use ($project) {
            $cp->setAttribute('other_company', $cp->connection->getOtherCompany($project->company_id));
        });

        // Load available connections for adding participants
        $connections = Connection::where('company1_id', $project->company_id)
            ->orWhere('company2_id', $project->company_id)
            ->with(['company1', 'company2'])
            ->get();

        $availableConnections = $connections->map(function ($connection) use ($project) {
            return [
                'connection_id' => $connection->id,
                'company'       => $connection->company1_id === $project->company_id
                    ? $connection->company2
                    : $connection->company1,
            ];
        });

        $project->setAttribute('available_connections', $availableConnections);
        $project->companysActiveProjects->each(fn ($_) => $_->append('state'));

        // Add milestone state counts
        $milestoneStateCounts = $project->milestones()
            ->selectRaw('state, COUNT(*) as count')
            ->groupBy('state')
            ->pluck('count', 'state')
            ->toArray();

        $project->setAttribute('no_invoice_focus', $project->foci()->whereNull('invoice_item_id')->sum('duration'));
        // Ensure all states are represented (default to 0)
        $project->setAttribute('milestone_state_counts', [
            'todo'        => $milestoneStateCounts[0] ?? 0,
            'in_progress' => $milestoneStateCounts[1] ?? 0,
            'done'        => $milestoneStateCounts[2] ?? 0,
            'total'       => array_sum($milestoneStateCounts),
        ]);
        $project->setAttribute('quote_descriptions', $project->getQuoteDescriptions());

        $project->append(['net', 'hours_invested', 'personalized', 'params', 'uninvoiced_hours', 'started_at', 'finished_at', 'timeline_chart']);
        $project->setAttribute('oldest_unbilled_focus_at', $project->foci_unbilled()->oldest('started_at')->value('started_at'));
        $project->setAttribute('invoiced_downpayments', (float)$project->invoiceItems()->where('stage', 2)->whereNotNull('invoice_id')->sum('net'));

        $appends = ['foci_by_user', 'my_prediction', 'progress'];
        if (! $project->is_time_based) {
            $appends[] = 'fociSum';
        }
        $project->invoiceItems->each(fn ($item) => $item->append($appends));

        $project->company->setAttribute('params', $project->company->params);

        $totalDecided    = $project->company->projects()->whereBudgetBased()
            ->whereHas('latestState', fn ($q) => $q->where('progress', '>=', ProjectState::Running)->where('is_in_stats', true))
            ->count();
        $totalSuccessful = $project->company->projects()->whereBudgetBased()
            ->whereHas('latestState', fn ($q) => $q->where('progress', ProjectState::Finished)->where('is_successful', true)->where('is_in_stats', true))
            ->count();
        $project->company->setAttribute(
            'quote_acceptance_rate',
            $totalDecided > 0 ? round($totalSuccessful / $totalDecided, 3) : null
        );
        $avgPaymentDays = $project->company->invoices()
            ->whereNotNull('paid_at')
            ->selectRaw('AVG(DATEDIFF(paid_at, created_at)) as avg_days')
            ->value('avg_days');
        $project->company->setAttribute('avg_payment_days', $avgPaymentDays !== null ? (int)round($avgPaymentDays) : null);

        if ($project->is_time_based) {
            // Optimized query - move filter to database level
            $d = InvoiceItem::whereProjectId($project->id)
                ->whereHas('invoice', fn ($q) => $q->where('created_at', '>', now()->subYear()))
                ->sum('net');
            $project->setAttribute('revenue_last_12', floatval($d));
        }
        return $project;
    }
    public function storeAssignee(Request $request, Project $_) {
        return $_->addAssigneeFromRequest($request);
    }
    public function updateSetMainContact(Request $request, Project $_) {
        $request->validate([
            'assignment_id' => 'required|integer|exists:assignments,id',
        ]);

        $assignment = Assignment::findOrFail($request->assignment_id);

        // Verify assignment belongs to this project
        if ($assignment->parent_id != $_->id) {
            return response()->json(['error' => 'Assignment does not belong to this project'], 403);
        }

        $_->setMainContactByAssignment($assignment);

        // Return success - frontend will call parent.reload() to get fresh project data
        return response()->json(['success' => true, 'assignment_id' => $assignment->id]);
    }
    public function storeMilestone(Request $request, Project $_) {
        $data = $request->validate([
            'name'       => 'string|nullable',
            'started_at' => 'date|nullable',
            'due_at'     => 'date|nullable',
            'duration'   => 'integer|min:0|nullable',
            'progress'   => 'numeric|min:0|max:100|nullable',
            'state'      => 'integer|nullable',
            'position'   => 'integer|nullable',
        ]);

        // Set defaults if not provided
        $data['name']     = $data['name'] ?? 'New Milestone';
        $data['duration'] = $data['duration'] ?? 1;
        $data['progress'] = $data['progress'] ?? 0;
        $data['state']    = $data['state'] ?? 0;

        // Set default dates if not provided
        if (! isset($data['started_at'])) {
            $data['started_at'] = now()->toDateString();
        }
        if (! isset($data['due_at'])) {
            $data['due_at'] = now()->addDays(7)->toDateString();
        }

        // Auto-assign to current user if not provided
        if (! isset($data['user_id'])) {
            $data['user_id'] = request()->user()->id;
        }

        // Set position to next available if not provided
        if (! isset($data['position'])) {
            $maxPosition      = $_->milestones()->max('position') ?? -1;
            $data['position'] = $maxPosition + 1;
        }

        // The project_id is automatically set by the relationship
        // Remove project_id from data if it was passed to avoid conflicts
        unset($data['project_id']);
        return $_->milestones()->create($data);
    }
    public function indexMilestones(Request $request, Project $_) {
        $currentUser = $request->user();

        $milestones = $_->milestones()->with(['dependants', 'dependees', 'tasks', 'invoiceItems'])->orderBy('position')->get();
        $milestones->each->append('children');

        // Load tasks assigned to current user for the project
        $projectTasks = Task::where('parent_type', 'App\\Models\\Project')
            ->where('parent_id', $_->id)
            ->whereExists(function ($query) use ($currentUser) {
                $query->select(DB::raw(1))
                    ->from('assignments')
                    ->whereColumn('assignments.parent_id', 'tasks.id')
                    ->where('assignments.parent_type', 'App\\Models\\Task')
                    ->where('assignments.assignee_id', $currentUser->id)
                    ->where('assignments.assignee_type', 'App\\Models\\User');
            })
            ->with('assignee.assignee')
            ->get();

        // Load tasks assigned to current user for all milestones
        $milestoneIds   = $milestones->pluck('id');
        $milestoneTasks = Task::where('parent_type', 'App\\Models\\Milestone')
            ->whereIn('parent_id', $milestoneIds)
            ->whereExists(function ($query) use ($currentUser) {
                $query->select(DB::raw(1))
                    ->from('assignments')
                    ->whereColumn('assignments.parent_id', 'tasks.id')
                    ->where('assignments.parent_type', 'App\\Models\\Task')
                    ->where('assignments.assignee_id', $currentUser->id)
                    ->where('assignments.assignee_type', 'App\\Models\\User');
            })
            ->with('assignee.assignee')
            ->get()
            ->groupBy('parent_id');

        // Attach tasks to each milestone
        $milestonesWithTasks = $milestones->map(fn ($milestone) => [
            'milestone' => $milestone,
            'tasks'     => $milestoneTasks->get($milestone->id, collect()),
        ]);
        return [
            'project_tasks' => $projectTasks,
            'milestones'    => $milestonesWithTasks->values(),
        ];
    }
    public function convertInvoiceItemsToMilestones(Request $request, Project $_) {
        return response()->json($_->convertItemsToMilestones());
    }
    public function makeQuote(Project $_) {
        return $_->makeQuote();
    }
    public function indexFrameworks(Request $request) {
        $gitLinks = PluginLink::where('type', 'git')
            ->where('is_deprecated', false)
            ->whereNotNull('framework_id')
            ->whereHas('framework', fn ($q) => $q->where('name', '!=', 'unknown'))
            ->with(['framework', 'parent'])
            ->get();

        $grouped = $gitLinks->groupBy('url')->map(fn ($links) => [
            'url'               => $links->first()->url,
            'framework'         => $links->first()->framework?->name,
            'name'              => $links->first()->name,
            'framework_version' => $links->first()->framework_version,
            'projects'          => $links->map(fn ($link) => [
                'id'         => $link->parent?->id,
                'name'       => $link->parent?->name,
                'state'      => $link->parent?->state,
                'company'    => $link->parent?->company,
                'project_id' => $link->parent?->project_id,
            ])->filter(fn ($p) => $p['id'] !== null)->values(),
        ])->values();
        return $grouped;
    }
    public function updateFrameworks(Request $request) {
        $validated = $request->validate([
            'url'           => 'required|string',
            'is_deprecated' => 'sometimes|boolean',
        ]);

        $updated = PluginLink::where('url', $validated['url'])->update([
            'is_deprecated' => $validated['is_deprecated'] ?? false,
        ]);
        return response()->json([
            'success' => true,
            'updated' => $updated,
        ]);
    }
    public function indexFrameworksLatest(Request $request) {
        return Framework::where('name', '!=', 'unknown')
            ->whereNotNull('latest_version')
            ->select('id', 'name', 'latest_version')
            ->get();
    }
    public function indexMissingGit(Request $request) {
        return Project::whereRunning()
            ->whereNot('is_internal', true)
            ->where('no_git_required', false)
            ->whereDoesntHave('pluginLinks', fn ($q) => $q->where('type', 'git'))
            ->with(['company', 'latestState'])
            ->latest()
            ->get()
            ->append(['net_remaining', 'hours_invested']);
    }
}
