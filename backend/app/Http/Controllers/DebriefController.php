<?php

namespace App\Http\Controllers;

use App\Models\DebriefPositive;
use App\Models\DebriefProblem;
use App\Models\DebriefProblemCategory;
use App\Models\DebriefProjectDebrief;
use App\Models\DebriefSolution;
use App\Models\Project;
use App\Services\DebriefStatisticsService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class DebriefController extends Controller {
    public function __construct(
        protected DebriefStatisticsService $statisticsService
    ) {}

    // ############
    // CATEGORIES
    // ############

    public function indexCategories() {
        return DebriefProblemCategory::orderBy('position')->get();
    }

    // ############
    // PROBLEMS
    // ############

    public function indexProblems(Request $request) {
        $query = DebriefProblem::with('category')->orderByUsage();

        if ($request->has('q') && strlen($request->q) > 0) {
            $query->search($request->q);
        }

        if ($request->has('category_id')) {
            $query->byCategory($request->category_id);
        }

        if ($request->has('limit')) {
            return $query->limit((int)$request->limit)->get();
        }
        return $query->paginate(50)->withQueryString();
    }
    public function storeProblem(Request $request) {
        $validated = $request->validate([
            'title'                       => 'required|string|max:255',
            'description'                 => 'nullable|string',
            'debrief_problem_category_id' => 'required|exists:debrief_problem_categories,id',
        ]);

        $validated['created_by_user_id'] = $request->user()?->id;
        return DebriefProblem::create($validated)->load('category');
    }
    public function showProblem(DebriefProblem $problem) {
        return $problem->load(['category', 'solutions', 'createdBy']);
    }
    public function updateProblem(Request $request, DebriefProblem $problem) {
        $validated = $request->validate([
            'title'                       => 'sometimes|string|max:255',
            'description'                 => 'sometimes|nullable|string',
            'debrief_problem_category_id' => 'sometimes|exists:debrief_problem_categories,id',
        ]);

        $problem->update($validated);
        return $problem->load('category');
    }
    public function destroyProblem(DebriefProblem $problem) {
        $problem->delete();
        return response(null, 204);
    }

    // ############
    // SOLUTIONS
    // ############

    public function indexSolutions(Request $request) {
        $query = DebriefSolution::orderByUsage();

        if ($request->has('q') && strlen($request->q) > 0) {
            $query->search($request->q);
        }

        if ($request->has('limit')) {
            return $query->limit((int)$request->limit)->get();
        }
        return $query->paginate(50)->withQueryString();
    }
    public function storeSolution(Request $request) {
        $validated = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
        ]);

        $validated['created_by_user_id'] = $request->user()?->id;
        return DebriefSolution::create($validated);
    }
    public function updateSolution(Request $request, DebriefSolution $solution) {
        $validated = $request->validate([
            'title'       => 'sometimes|string|max:255',
            'description' => 'nullable|string',
        ]);

        $solution->update($validated);
        return $solution;
    }
    public function destroySolution(DebriefSolution $solution) {
        $solution->delete();
        return response(null, 204);
    }

    // #######################
    // PROBLEM-SOLUTION LINKS
    // #######################

    public function storeProblemSolution(Request $request, DebriefProblem $problem) {
        $validated = $request->validate([
            'debrief_solution_id'        => 'required|exists:debrief_solutions,id',
            'debrief_project_debrief_id' => 'nullable|exists:debrief_project_debriefs,id',
            'effectiveness_rating'       => 'nullable|integer|min:1|max:5',
            'notes'                      => 'nullable|string',
        ]);

        $validated['linked_by_user_id'] = $request->user()?->id;

        $problem->solutions()->attach($validated['debrief_solution_id'], [
            'debrief_project_debrief_id' => $validated['debrief_project_debrief_id'] ?? null,
            'effectiveness_rating'       => $validated['effectiveness_rating'] ?? null,
            'notes'                      => $validated['notes'] ?? null,
            'linked_by_user_id'          => $validated['linked_by_user_id'],
        ]);

        $solution = DebriefSolution::find($validated['debrief_solution_id']);
        $solution->incrementUsageCount();
        return $problem->load('solutions');
    }
    public function updateProblemSolution(Request $request, DebriefProblem $problem, DebriefSolution $solution) {
        $validated = $request->validate([
            'effectiveness_rating' => 'nullable|integer|min:1|max:5',
            'notes'                => 'nullable|string',
        ]);

        $problem->solutions()->updateExistingPivot($solution->id, $validated);

        $solution->updateAverageEffectiveness();
        return $problem->load('solutions');
    }
    public function destroyProblemSolution(DebriefProblem $problem, DebriefSolution $solution) {
        $problem->solutions()->detach($solution->id);
        $solution->decrementUsageCount();
        $solution->updateAverageEffectiveness();
        return response(null, 204);
    }

    // ##################
    // PROJECT DEBRIEFS
    // ##################

    public function indexDebriefs(Request $request) {
        $query = DebriefProjectDebrief::with(['project.company', 'conductedBy']);

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        return $query->latest()->paginate(50)->withQueryString();
    }
    public function indexProjectDebriefs(Project $project) {
        return $project->debriefs()->with(['conductedBy', 'debriefedUser', 'problems.category', 'positives.category'])->latest()->get();
    }
    public function storeDebrief(Request $request, Project $project) {
        $validated = $request->validate([
            'debriefed_user_id' => 'nullable|exists:users,id',
        ]);

        $debrief = DebriefProjectDebrief::create([
            'project_id'           => $project->id,
            'conducted_by_user_id' => $request->user()?->id,
            'debriefed_user_id'    => $validated['debriefed_user_id'] ?? null,
            'status'               => 'draft',
        ]);
        return $debrief->load(['project.company', 'conductedBy', 'debriefedUser', 'problems.category', 'positives.category']);
    }
    public function destroyDebrief(DebriefProjectDebrief $debrief) {
        $debrief->delete();
        return response(null, 204);
    }
    public function updateDebrief(Request $request, DebriefProjectDebrief $debrief) {
        $validated = $request->validate([
            'summary_notes'     => 'nullable|string',
            'rating'            => 'nullable|integer|min:1|max:5',
            'status'            => 'sometimes|in:draft,completed',
            'debriefed_user_id' => 'nullable|exists:users,id',
        ]);

        if (isset($validated['status']) && $validated['status'] === 'completed') {
            $debrief->markAsCompleted();
        } else {
            $debrief->update($validated);
        }
        return $debrief->load(['project.company', 'conductedBy', 'debriefedUser', 'problems.category', 'positives.category']);
    }

    // #####################
    // PROBLEM-DEBRIEF LINKS
    // #####################

    public function storeDebriefProblem(Request $request, DebriefProjectDebrief $debrief) {
        $validated = $request->validate([
            'debrief_problem_id' => 'required|exists:debrief_problems,id',
            'severity'           => 'sometimes|in:low,medium,high,critical',
            'context_notes'      => 'nullable|string',
        ]);

        $exists = $debrief->problems()->where('debrief_problem_id', $validated['debrief_problem_id'])->exists();
        if ($exists) {
            return response(['error' => 'Problem already attached to this debrief'], 422);
        }

        $debrief->problems()->attach($validated['debrief_problem_id'], [
            'severity'            => $validated['severity'] ?? 'medium',
            'context_notes'       => $validated['context_notes'] ?? null,
            'reported_by_user_id' => $request->user()?->id,
        ]);

        $problem = DebriefProblem::find($validated['debrief_problem_id']);
        $problem->incrementUsageCount();
        return $debrief->load(['problems.category', 'positives.category']);
    }
    public function updateDebriefProblem(Request $request, DebriefProjectDebrief $debrief, DebriefProblem $problem) {
        $validated = $request->validate([
            'severity'      => 'sometimes|in:low,medium,high,critical',
            'context_notes' => 'nullable|string',
        ]);

        $debrief->problems()->updateExistingPivot($problem->id, $validated);
        return $debrief->load(['problems.category', 'positives.category']);
    }
    public function destroyDebriefProblem(DebriefProjectDebrief $debrief, DebriefProblem $problem) {
        $debrief->problems()->detach($problem->id);
        $problem->decrementUsageCount();
        return response(null, 204);
    }

    // ###########
    // POSITIVES
    // ###########

    public function storePositive(Request $request, DebriefProjectDebrief $debrief) {
        if ($request->filled('existing_id')) {
            $positive = DebriefPositive::findOrFail($request->existing_id);
            if (! $debrief->positives()->where('debrief_positives.id', $positive->id)->exists()) {
                $debrief->positives()->attach($positive->id, ['reported_by_user_id' => $request->user()?->id]);
            }
        } else {
            $validated = $request->validate([
                'title'                       => 'required|string|max:255',
                'description'                 => 'nullable|string',
                'debrief_problem_category_id' => 'nullable|exists:debrief_problem_categories,id',
            ]);
            $validated['reported_by_user_id'] = $request->user()?->id;
            $positive                         = DebriefPositive::create($validated);
            $debrief->positives()->attach($positive->id, ['reported_by_user_id' => $request->user()?->id]);
        }
        return $positive->load('category');
    }
    public function searchPositives(Request $request) {
        $query = DebriefPositive::with('category')
            ->orderBy('created_at', 'desc')
            ->limit(20);

        if ($request->has('q') && strlen($request->q) > 0) {
            $query->search($request->q);
        }
        return $query->get();
    }
    public function updatePositive(Request $request, DebriefPositive $positive) {
        $validated = $request->validate([
            'title'                       => 'sometimes|string|max:255',
            'description'                 => 'nullable|string',
            'debrief_problem_category_id' => 'nullable|exists:debrief_problem_categories,id',
        ]);

        $positive->update($validated);
        return $positive->load('category');
    }
    public function destroyDebriefPositive(DebriefProjectDebrief $debrief, DebriefPositive $positive) {
        $debrief->positives()->detach($positive->id);
        return response(null, 204);
    }
    public function destroyPositive(DebriefPositive $positive) {
        $positive->delete();
        return response(null, 204);
    }

    // ###########
    // ANALYTICS
    // ###########

    public function showStatsAggregated(Request $request) {
        return $this->statisticsService->getAggregatedStats($request->all());
    }
    public function showStatsCategories(Request $request) {
        return $this->statisticsService->getCategoryBreakdown($request->all());
    }
    public function showStatsTopProblems(Request $request) {
        return $this->statisticsService->getTopProblems(
            $request->input('limit', 10),
            $request->all()
        );
    }
    public function showStatsTopSolutions(Request $request) {
        return $this->statisticsService->getTopSolutions(
            $request->input('limit', 10)
        );
    }
    public function showStatsTrends(Request $request) {
        return $this->statisticsService->getTrends(
            $request->input('months', 12)
        );
    }
    public function showStatsTopPositives(Request $request) {
        return $this->statisticsService->getTopPositives(
            $request->input('limit', 10),
            $request->all()
        );
    }
    public function showStatsCategoriesPositives(Request $request) {
        return $this->statisticsService->getCategoryBreakdownPositives($request->all());
    }
    public function combineProblems(Request $request) {
        $validated = $request->validate([
            'keep_id'     => ['required', Rule::exists('debrief_problems', 'id')->whereNull('deleted_at')],
            'merge_ids'   => 'required|array|min:1',
            'merge_ids.*' => [Rule::exists('debrief_problems', 'id')->whereNull('deleted_at')],
            'title'       => 'required|string|max:255',
        ]);

        $keepId   = $validated['keep_id'];
        $mergeIds = array_values(array_filter($validated['merge_ids'], fn ($id) => $id !== $keepId));
        return DB::transaction(function () use ($keepId, $mergeIds, $validated) {
            $keep = DebriefProblem::findOrFail($keepId);

            foreach (DebriefProblem::findMany($mergeIds) as $merge) {
                $keepDebriefIds = $keep->projectDebriefs()->pluck('debrief_project_debriefs.id');

                foreach ($merge->projectDebriefs()->whereNotIn('debrief_project_debriefs.id', $keepDebriefIds)->get() as $debrief) {
                    $keep->projectDebriefs()->attach($debrief->id, [
                        'severity'            => $debrief->pivot->severity,
                        'context_notes'       => $debrief->pivot->context_notes,
                        'reported_by_user_id' => $debrief->pivot->reported_by_user_id,
                    ]);
                }

                $merge->projectDebriefs()->detach();
                $merge->delete();
            }

            $keep->title       = $validated['title'];
            $keep->usage_count = $keep->projectDebriefs()->count();
            $keep->save();
            return $keep->load('category');
        });
    }
    public function combinePositives(Request $request) {
        $validated = $request->validate([
            'ids'   => 'required|array|min:2',
            'ids.*' => [Rule::exists('debrief_positives', 'id')->whereNull('deleted_at')],
            'title' => 'required|string|max:255',
        ]);
        return DB::transaction(function () use ($validated) {
            $keepId   = $validated['ids'][0];
            $mergeIds = array_slice($validated['ids'], 1);
            $keep     = DebriefPositive::findOrFail($keepId);

            $keepDebriefIds = $keep->projectDebriefs()->pluck('debrief_project_debriefs.id');

            foreach (DebriefPositive::findMany($mergeIds) as $merge) {
                foreach ($merge->projectDebriefs()->whereNotIn('debrief_project_debriefs.id', $keepDebriefIds)->get() as $debrief) {
                    $keep->projectDebriefs()->attach($debrief->id, [
                        'reported_by_user_id' => $debrief->pivot->reported_by_user_id,
                    ]);
                }
                $merge->projectDebriefs()->detach();
                $merge->delete();
            }

            $keep->title = $validated['title'];
            $keep->save();
            return $keep->load('category');
        });
    }
    public function showStatsTopCustomersWorst(Request $request) {
        return $this->statisticsService->getTopCustomersByProblems(
            $request->input('limit', 10),
            $request->all()
        );
    }
    public function showStatsTopCustomersBest(Request $request) {
        return $this->statisticsService->getTopCustomersByPositives(
            $request->input('limit', 10),
            $request->all()
        );
    }
}
