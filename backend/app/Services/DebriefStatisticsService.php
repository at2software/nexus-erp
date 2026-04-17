<?php

namespace App\Services;

use App\Models\Company;
use App\Models\DebriefProblem;
use App\Models\DebriefProblemCategory;
use App\Models\DebriefProjectDebrief;
use App\Models\DebriefSolution;
use App\Models\Project;
use Illuminate\Support\Facades\DB;

class DebriefStatisticsService {
    public function getAggregatedStats(array $filters = []): array {
        $query = DebriefProjectDebrief::query();

        if (isset($filters['status'])) {
            $query->where('status', $filters['status']);
        }

        if (isset($filters['from_date'])) {
            $query->where('conducted_at', '>=', $filters['from_date']);
        }

        if (isset($filters['to_date'])) {
            $query->where('conducted_at', '<=', $filters['to_date']);
        }

        $totalDebriefs     = $query->count();
        $completedDebriefs = (clone $query)->completed()->count();

        $problemCount = DB::table('debrief_problem_project_debrief')
            ->whereIn('debrief_project_debrief_id', $query->pluck('id'))
            ->count();

        $avgProblemsPerDebrief = $totalDebriefs > 0 ? round($problemCount / $totalDebriefs, 1) : 0;

        $avgEffectiveness = DB::table('debrief_problem_solution')
            ->whereNotNull('effectiveness_rating')
            ->avg('effectiveness_rating');
        return [
            'total_debriefs'             => $totalDebriefs,
            'completed_debriefs'         => $completedDebriefs,
            'draft_debriefs'             => $totalDebriefs - $completedDebriefs,
            'total_problems_recorded'    => $problemCount,
            'avg_problems_per_debrief'   => $avgProblemsPerDebrief,
            'avg_solution_effectiveness' => round($avgEffectiveness ?? 0, 2),
            'total_unique_problems'      => DebriefProblem::count(),
            'total_unique_solutions'     => DebriefSolution::count(),
        ];
    }
    public function getCategoryBreakdown(array $filters = []): array {
        $categories = DebriefProblemCategory::orderBy('position')->get();

        $query = DB::table('debrief_problem_project_debrief')
            ->join('debrief_problems', 'debrief_problem_project_debrief.debrief_problem_id', '=', 'debrief_problems.id')
            ->join('debrief_project_debriefs', 'debrief_problem_project_debrief.debrief_project_debrief_id', '=', 'debrief_project_debriefs.id')
            ->join('projects', 'debrief_project_debriefs.project_id', '=', 'projects.id')
            ->whereNull('debrief_problems.deleted_at')
            ->whereNull('projects.deleted_at');

        if (isset($filters['from_date'])) {
            $query->where('debrief_project_debriefs.conducted_at', '>=', $filters['from_date']);
        }

        if (isset($filters['to_date'])) {
            $query->where('debrief_project_debriefs.conducted_at', '<=', $filters['to_date']);
        }

        $severityWeights = [
            'low'      => 1,
            'medium'   => 2,
            'high'     => 3,
            'critical' => 4,
        ];

        $result = [];
        foreach ($categories as $category) {
            $rows = (clone $query)
                ->where('debrief_problems.debrief_problem_category_id', $category->id)
                ->select(
                    'debrief_problems.id',
                    'debrief_problems.title',
                    'debrief_problem_project_debrief.severity',
                    'debrief_problems.usage_count',
                    'projects.id as project_id'
                )
                ->get();

            // Severity counts from all occurrences (not deduplicated)
            $severityCounts = ['low' => 0, 'medium' => 0, 'high' => 0, 'critical' => 0];
            $totalWeight    = 0;
            foreach ($rows as $row) {
                $severityCounts[$row->severity]++;
                $totalWeight += $severityWeights[$row->severity];
            }

            // Load projects for this category's problem occurrences
            $allProjectIds = $rows->pluck('project_id')->filter()->unique();
            $projects      = Project::whereIn('id', $allProjectIds)->get()->keyBy('id');

            // Deduplicate problems, collecting their distinct projects
            $problems = [];
            foreach ($rows->groupBy('id') as $problemId => $problemRows) {
                $first           = $problemRows->first();
                $maxSeverity     = $problemRows->sortByDesc(fn ($r) => $severityWeights[$r->severity] ?? 0)->first()->severity;
                $problemProjects = $problemRows->pluck('project_id')->filter()->unique()
                    ->map(fn ($id) => $projects->get($id)?->only(['id', 'name', 'icon']))
                    ->filter()->values()->toArray();

                $problems[] = [
                    'id'          => $first->id,
                    'title'       => $first->title,
                    'severity'    => $maxSeverity,
                    'usage_count' => $first->usage_count ?? 0,
                    'projects'    => $problemProjects,
                ];
            }

            $result[] = [
                'category_id'     => $category->id,
                'category_name'   => $category->name,
                'category_color'  => $category->color,
                'category_icon'   => $category->icon,
                'total_problems'  => count($problems),
                'severity_counts' => $severityCounts,
                'weighted_score'  => $totalWeight,
                'problems'        => $problems,
            ];
        }
        return $result;
    }
    public function getTopProblems(int $limit = 10, array $filters = []): array {
        $query = DebriefProblem::with('category')
            ->orderByUsage('desc')
            ->limit($limit);

        if (isset($filters['category_id'])) {
            $query->byCategory($filters['category_id']);
        }
        return $query->get()->map(fn ($problem) => [
            'id'             => $problem->id,
            'title'          => $problem->title,
            'category'       => $problem->category->name,
            'category_color' => $problem->category->color,
            'usage_count'    => $problem->usage_count,
        ])->toArray();
    }
    public function getTopSolutions(int $limit = 10): array {
        return DebriefSolution::orderByEffectiveness('desc')
            ->orderByUsage('desc')
            ->limit($limit)
            ->get()
            ->map(fn ($solution) => [
                'id'                => $solution->id,
                'title'             => $solution->title,
                'avg_effectiveness' => round($solution->avg_effectiveness_rating ?? 0, 2),
                'usage_count'       => $solution->usage_count,
            ])->toArray();
    }
    public function getTrends(int $months = 12): array {
        $startDate = now()->subMonths($months)->startOfMonth();

        $debriefs = DebriefProjectDebrief::where('conducted_at', '>=', $startDate)
            ->selectRaw('DATE_FORMAT(conducted_at, "%Y-%m") as month, COUNT(*) as count')
            ->groupBy('month')
            ->orderBy('month')
            ->pluck('count', 'month')
            ->toArray();

        $problems = DB::table('debrief_problem_project_debrief')
            ->join('debrief_project_debriefs', 'debrief_problem_project_debrief.debrief_project_debrief_id', '=', 'debrief_project_debriefs.id')
            ->where('debrief_project_debriefs.conducted_at', '>=', $startDate)
            ->selectRaw('DATE_FORMAT(debrief_project_debriefs.conducted_at, "%Y-%m") as month, COUNT(*) as count')
            ->groupBy('month')
            ->orderBy('month')
            ->pluck('count', 'month')
            ->toArray();

        $result  = [];
        $current = $startDate->copy();
        while ($current <= now()) {
            $monthKey = $current->format('Y-m');
            $result[] = [
                'month'          => $monthKey,
                'debriefs_count' => $debriefs[$monthKey] ?? 0,
                'problems_count' => $problems[$monthKey] ?? 0,
            ];
            $current->addMonth();
        }
        return $result;
    }
    public function getTopPositives(int $limit = 10, array $filters = []): array {
        $query = DB::table('debrief_positives')
            ->join('debrief_positive_project_debrief', 'debrief_positives.id', '=', 'debrief_positive_project_debrief.debrief_positive_id')
            ->join('debrief_project_debriefs', 'debrief_positive_project_debrief.debrief_project_debrief_id', '=', 'debrief_project_debriefs.id')
            ->leftJoin('debrief_problem_categories', 'debrief_positives.debrief_problem_category_id', '=', 'debrief_problem_categories.id')
            ->whereNull('debrief_positives.deleted_at')
            ->select(
                DB::raw('MIN(debrief_positives.id) as id'),
                'debrief_positives.title',
                'debrief_positives.debrief_problem_category_id',
                DB::raw('COUNT(*) as count'),
                'debrief_problem_categories.name as category_name',
                'debrief_problem_categories.color as category_color'
            )
            ->groupBy('debrief_positives.title', 'debrief_positives.debrief_problem_category_id', 'debrief_problem_categories.name', 'debrief_problem_categories.color')
            ->orderByDesc('count')
            ->limit($limit);

        if (isset($filters['category_id'])) {
            $query->where('debrief_positives.debrief_problem_category_id', $filters['category_id']);
        }

        if (isset($filters['from_date'])) {
            $query->where('debrief_project_debriefs.conducted_at', '>=', $filters['from_date']);
        }
        if (isset($filters['to_date'])) {
            $query->where('debrief_project_debriefs.conducted_at', '<=', $filters['to_date']);
        }

        $positives = $query->get();
        $titles    = $positives->pluck('title')->unique();

        $projectQuery = DB::table('debrief_positives')
            ->join('debrief_positive_project_debrief', 'debrief_positives.id', '=', 'debrief_positive_project_debrief.debrief_positive_id')
            ->join('debrief_project_debriefs', 'debrief_positive_project_debrief.debrief_project_debrief_id', '=', 'debrief_project_debriefs.id')
            ->join('projects', 'debrief_project_debriefs.project_id', '=', 'projects.id')
            ->whereNull('debrief_positives.deleted_at')
            ->whereIn('debrief_positives.title', $titles)
            ->whereNull('projects.deleted_at')
            ->select('debrief_positives.title', 'projects.id as project_id')
            ->distinct();

        if (isset($filters['from_date'])) {
            $projectQuery->where('debrief_project_debriefs.conducted_at', '>=', $filters['from_date']);
        }
        if (isset($filters['to_date'])) {
            $projectQuery->where('debrief_project_debriefs.conducted_at', '<=', $filters['to_date']);
        }

        $projectsByTitle = $projectQuery->get()->groupBy('title');
        $allProjectIds   = $projectsByTitle->flatMap(fn ($rows) => $rows->pluck('project_id'))->unique();
        $projects        = Project::whereIn('id', $allProjectIds)->get()->keyBy('id');
        return $positives->map(fn ($positive) => [
            'id'             => $positive->id,
            'title'          => $positive->title,
            'category'       => $positive->category_name,
            'category_color' => $positive->category_color,
            'count'          => $positive->count,
            'projects'       => $projectsByTitle->get($positive->title, collect())
                ->pluck('project_id')->unique()
                ->map(fn ($id) => $projects->get($id)?->only(['id', 'name', 'icon']))
                ->filter()->values()->toArray(),
        ])->toArray();
    }
    public function getTopCustomersByProblems(int $limit = 10, array $filters = []): array {
        $customerCategory = DebriefProblemCategory::where('name', 'Customer')->first();
        if (! $customerCategory) {
            return [];
        }

        $query = DB::table('debrief_problem_project_debrief')
            ->join('debrief_problems', 'debrief_problem_project_debrief.debrief_problem_id', '=', 'debrief_problems.id')
            ->join('debrief_project_debriefs', 'debrief_problem_project_debrief.debrief_project_debrief_id', '=', 'debrief_project_debriefs.id')
            ->join('projects', 'debrief_project_debriefs.project_id', '=', 'projects.id')
            ->where('debrief_problems.debrief_problem_category_id', $customerCategory->id)
            ->whereNull('debrief_problems.deleted_at')
            ->whereNull('projects.deleted_at');

        if (isset($filters['from_date'])) {
            $query->where('debrief_project_debriefs.conducted_at', '>=', $filters['from_date']);
        }
        if (isset($filters['to_date'])) {
            $query->where('debrief_project_debriefs.conducted_at', '<=', $filters['to_date']);
        }

        $rows = $query
            ->select('projects.company_id', DB::raw('COUNT(*) as problem_count'))
            ->groupBy('projects.company_id')
            ->orderByDesc('problem_count')
            ->limit($limit)
            ->get();

        $companies = Company::whereIn('id', $rows->pluck('company_id')->filter()->unique())->get()->keyBy('id');
        return $rows->map(fn ($row) => array_merge(
            $companies->get($row->company_id)?->onlyAvatar() ?? ['id' => $row->company_id, 'name' => 'Unknown', 'icon' => ''],
            ['count' => $row->problem_count]
        ))->toArray();
    }
    public function getTopCustomersByPositives(int $limit = 10, array $filters = []): array {
        $customerCategory = DebriefProblemCategory::where('name', 'Customer')->first();
        if (! $customerCategory) {
            return [];
        }

        $query = DB::table('debrief_positives')
            ->join('debrief_positive_project_debrief', 'debrief_positives.id', '=', 'debrief_positive_project_debrief.debrief_positive_id')
            ->join('debrief_project_debriefs', 'debrief_positive_project_debrief.debrief_project_debrief_id', '=', 'debrief_project_debriefs.id')
            ->join('projects', 'debrief_project_debriefs.project_id', '=', 'projects.id')
            ->whereNull('debrief_positives.deleted_at')
            ->where('debrief_positives.debrief_problem_category_id', $customerCategory->id)
            ->whereNull('projects.deleted_at');

        if (isset($filters['from_date'])) {
            $query->where('debrief_project_debriefs.conducted_at', '>=', $filters['from_date']);
        }
        if (isset($filters['to_date'])) {
            $query->where('debrief_project_debriefs.conducted_at', '<=', $filters['to_date']);
        }

        $rows = $query
            ->select('projects.company_id', DB::raw('COUNT(*) as positive_count'))
            ->groupBy('projects.company_id')
            ->orderByDesc('positive_count')
            ->limit($limit)
            ->get();

        $companies = Company::whereIn('id', $rows->pluck('company_id')->filter()->unique())->get()->keyBy('id');
        return $rows->map(fn ($row) => array_merge(
            $companies->get($row->company_id)?->onlyAvatar() ?? ['id' => $row->company_id, 'name' => 'Unknown', 'icon' => ''],
            ['count' => $row->positive_count]
        ))->toArray();
    }
    public function getCategoryBreakdownPositives(array $filters = []): array {
        $categories = DebriefProblemCategory::orderBy('position')->get();

        $query = DB::table('debrief_positives')
            ->join('debrief_positive_project_debrief', 'debrief_positives.id', '=', 'debrief_positive_project_debrief.debrief_positive_id')
            ->join('debrief_project_debriefs', 'debrief_positive_project_debrief.debrief_project_debrief_id', '=', 'debrief_project_debriefs.id')
            ->whereNull('debrief_positives.deleted_at');

        if (isset($filters['from_date'])) {
            $query->where('debrief_project_debriefs.conducted_at', '>=', $filters['from_date']);
        }
        if (isset($filters['to_date'])) {
            $query->where('debrief_project_debriefs.conducted_at', '<=', $filters['to_date']);
        }

        $result = [];
        foreach ($categories as $category) {
            $total = (clone $query)
                ->where('debrief_positives.debrief_problem_category_id', $category->id)
                ->count();

            $result[] = [
                'category_id'     => $category->id,
                'category_name'   => $category->name,
                'category_color'  => $category->color,
                'category_icon'   => $category->icon,
                'total_positives' => $total,
            ];
        }
        return $result;
    }
}
