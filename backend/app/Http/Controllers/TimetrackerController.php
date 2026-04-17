<?php

namespace App\Http\Controllers;

use App\Helpers\NLog;
use App\Http\Middleware\Auth;
use App\Models\Assignment;
use App\Models\Company;
use App\Models\Focus;
use App\Models\Param;
use App\Models\Project;
use App\Models\ProjectState;
use App\Services\TimetrackerDataService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;

class TimetrackerController extends Controller {
    private const TARGET_PROJECT      = TimetrackerDataService::TARGET_PROJECT;
    private const TARGET_COMPANY      = TimetrackerDataService::TARGET_COMPANY;
    private const ORGANIZATIONAL_NAME = 'Organisational';

    private TimetrackerDataService $dataService;

    public function __construct() {
        $this->dataService = new TimetrackerDataService;
    }
    public function index() {
        $builderCompanies = request()->user()->assigned_companies();
        $meCompanyId      = Param::get('ME_ID')->value;
        if ($meCompanyId) {
            $my   = Company::find($meCompanyId);
            $orga = [
                'color'        => '#FF6700',
                'company_name' => self::ORGANIZATIONAL_NAME,
                'name'         => 'Organisational',
                'latest_focus' => ['started_at' => now(), 'comment' => ''],
                'is_project'   => false,
                'icon'         => $my->icon,
                'id'           => $my->id,
                'target'       => self::TARGET_COMPANY,
            ];
            // $builderCompanies->whereNot('id', $meCompanyId);
        }
        $projects  = $this->dataService->mapProjects(request()->user()->projects()->with('company')->wherePreparedOrRunning());
        $companies = $this->dataService->mapCompanies($builderCompanies);
        return $this->sorted([$orga], $projects, $companies);
    }
    private function sorted(...$args) {
        $a = array_merge(...$args);
        usort($a, fn ($a, $b) => strcmp($b['latest_focus']['started_at'] ?? '', $a['latest_focus']['started_at'] ?? ''));
        return $a;
    }
    private function getParentPolyFromRequest(): Project|Company|null {
        if (request()->has(self::TARGET_PROJECT)) {
            return Project::findOrFail(request(self::TARGET_PROJECT));
        }
        if (request()->has('company_id')) {
            return Company::findOrFail(request('company_id'));
        }
        return null;
    }
    public function store() {
        // deprecated. not used anymore? TBD: shut down
        request()->validate([
            'duration'           => 'required|numeric',
            'started_at'         => 'required|date',
            self::TARGET_PROJECT => 'required_without_all:company_id|exists:App\Models\Project,id',
            'company_id'         => 'required_without_all:project_id|exists:App\Models\Company,id',
            'is_unpaid'          => 'boolean',
            'item_focus_id'      => 'exists:App\Models\InvoiceItem,id',
        ]);

        $payload = [];
        if (request()->has('invoice_item_id')) {
            $payload['invoice_item_id'] = request('item_focus_id');
        }
        if ($parent = $this->getParentPolyFromRequest()) {
            if (is_a($parent, Project::class) && $parent->state->progress == ProjectState::Finished) {
                return response('Cannot create foci on finished projects!', 400);
            }
            if (is_a($parent, Project::class)) {
                if ($assignment = $parent->assignees()->where(request()->user()->toPoly('assignee'))->first()) {
                    $assignment->hours_planned = max(0, $assignment->hours_planned - request('duration'));
                    $assignment->save();
                }
            }
            request()->user()->update(Param::nullPoly('current_focus'));
            return $this->createFocus([...$parent->toPoly(), ...$payload]);
        } else {
            return response('no valid parent found', 400);
        }
    }
    public function subscribe() {
        request()->validate([
            self::TARGET_PROJECT => 'required_without_all:'.self::TARGET_COMPANY.'|exists:App\Models\Project,id',
            self::TARGET_COMPANY => 'required_without_all:'.self::TARGET_PROJECT.'|exists:App\Models\Company,id',
        ]);
        $parent = $this->getParentPolyFromRequest();

        $assignment = Assignment::firstOrCreate([
            ...Auth::user()->toPoly('assignee'),
            ...$parent->toPoly(),
        ], ['role' => 2]);
        return $assignment->wasRecentlyCreated ? $this->getParent() : response('Already subscribed', 406);
    }
    public function unsubscribe() {
        request()->validate([
            self::TARGET_PROJECT => 'required_without_all:'.self::TARGET_COMPANY.'|exists:App\Models\Project,id',
            self::TARGET_COMPANY => 'required_without_all:'.self::TARGET_PROJECT.'|exists:App\Models\Company,id',
        ]);
        $parent = $this->getParentPolyFromRequest();

        $deleted = Assignment::where($parent->toPoly())->whereAssignee(Auth::user())->delete();
        return $deleted ? $this->getParent() : response('No subscription found to unsubscribe from', 406);
    }
    public function createFocus($data = []) {
        $q = [
            'user_id'    => request()->user()->id,
            'started_at' => Carbon::parse(request('started_at')),
            'duration'   => request('duration'),
            'comment'    => request('comment'),
        ];
        $q = array_merge($q, $data);
        if (request()->has('is_unpaid')) {
            $q['is_unpaid'] = request('is_unpaid');
        }
        if (request()->has('item_focus_id')) {
            $q['invoice_item_id'] = request('item_focus_id');
        }
        if (empty($q['parent_type']) || empty($q['parent_id'])) {
            return response('parent is invalid', 400);
        }
        request()->user()->update(['current_focus_id' => null, 'current_focus_type' => null]);
        return Focus::create($q);
    }
    public function update() {
        NLog::info(request()->user()->name.' is using the deprecated API');
        // return response('this API endpoint is deprecated. Please use `timetracker/current_focus` instead', 299);
        $data = $this->getBody();
        if (empty($data->project_id)) {
            request()->user()->current_project_id = null;
            return request()->user()->save();
        }
        if ($project = Project::find($data->project_id)) {
            request()->user()->current_project_id = $project->id;
            return request()->user()->save();
        }
        return response()->make('project not found', 404);
    }
    public function getParent() {
        if (request()->has(self::TARGET_PROJECT)) {
            return $this->dataService->mapProjects(Project::where('id', request(self::TARGET_PROJECT)))[0];
        }
        if (request()->has(self::TARGET_COMPANY)) {
            return $this->dataService->mapCompanies(Company::where('id', request(self::TARGET_COMPANY)))[0];
        }
        return null;
    }
    public function getPureParent(): Project|Company|null {
        if (request()->has(self::TARGET_PROJECT)) {
            return Project::where('id', request(self::TARGET_PROJECT))->first();
        }
        if (request()->has(self::TARGET_COMPANY)) {
            return Company::where('id', request(self::TARGET_COMPANY))->first();
        }
        return null;
    }
    public function join() {
        request()->validate(['project_id' => 'required|exists:App\Models\Project,id']);
        request()->user()->projects()->associate(request('project_id'));
        return request()->user();
    }
    public function search() {
        request()->validate([
            'q' => 'required',
        ]);
        $projects  = $this->dataService->mapProjects(Project::wherePreparedOrRunning()->where('name', 'like', '%'.request('q').'%'));
        $companies = $this->dataService->mapCompanies(Company::where('vcard', 'like', '%'.request('q').'%'));
        return $this->sorted($projects, $companies);
    }
    public function updateCurrentFocus() {
        $parent = $this->getPureParent();
        $poly   = $parent ? $parent->toPoly('current_focus') : Param::nullPoly('current_focus');
        $user   = request()->user();
        if ($user->current_focus_id != $poly['current_focus_id'] || $user->current_focus_type != $poly['current_focus_type']) {
            request()->user()->update($poly);

            // Encapsulate plugin logic to prevent failures from breaking focus updates
            try {
                foreach (PluginController::getPluginControllers(PluginChatController::class) as $chatController) {
                    if ($userId = $chatController->getIdFor(request()->user())) {
                        if ($parent) {
                            $chatController->updatePosition($parent['name'], $userId);
                        } else {
                            $chatController->updatePosition('Organisational', $userId);
                        }
                    }
                }
            } catch (\Exception $e) {
                // Log the plugin error but don't let it break the focus update
                Log::warning('Plugin chat controller error during focus update', [
                    'error'   => $e->getMessage(),
                    'user_id' => request()->user()->id,
                    'parent'  => $parent ? $parent->toArray() : null,
                ]);
            }
            return response([
                'message' => 'successfully updated',
                'value'   => true,
            ]);
        } else {
            request()->user()->touch();
            return response([
                'message' => 'nothing to update',
                'value'   => false,
            ]);
        }
    }
    public function updateStatus() {
        request()->validate(['status' => 'required|in:online,offline,away,dnd']);
        if (request('status') === 'offline') {
            request()->user()->fill(Param::nullPoly('current_focus'));
            request()->user()->save();
        }

        // Encapsulate plugin logic to prevent failures from breaking status updates
        try {
            foreach (PluginController::getPluginControllers(PluginChatController::class) as $chatController) {
                if ($userId = $chatController->getIdFor(request()->user())) {
                    $chatController->updateStatus(request('status'), $userId);
                }
            }
        } catch (\Exception $e) {
            // Log the plugin error but don't let it break the status update
            Log::warning('Plugin chat controller error during status update', [
                'error'   => $e->getMessage(),
                'user_id' => request()->user()->id,
                'status'  => request('status'),
            ]);
        }
        return response('successfully updated');
    }
    public function indexRecentComments() {
        request()->validate([
            self::TARGET_PROJECT => 'required_without_all:'.self::TARGET_COMPANY.'|exists:App\Models\Project,id',
            self::TARGET_COMPANY => 'required_without_all:'.self::TARGET_PROJECT.'|exists:App\Models\Company,id',
        ]);

        $parent = $this->getParentPolyFromRequest();

        if (! $parent) {
            return response('No valid parent found', 400);
        }
        return Focus::where('user_id', request()->user()->id)
            ->where($parent->toPoly())
            ->whereNotNull('comment')
            ->where('comment', '!=', '')
            ->orderBy('started_at', 'desc')
            ->limit(200)
            ->pluck('comment')
            ->unique()
            ->take(30)
            ->values();
    }
}
