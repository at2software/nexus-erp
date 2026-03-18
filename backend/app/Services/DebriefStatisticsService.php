<?php

namespace App\Services;

use App\Models\DebriefPositive;
use App\Models\DebriefProblem;
use App\Models\DebriefProblemCategory;
use App\Models\DebriefProjectDebrief;
use App\Models\DebriefSolution;
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
            ->join('debrief_project_debriefs', 'debrief_problem_project_debrief.debrief_project_debrief_id', '=', 'debrief_project_debriefs.id');

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
            $categoryProblems = (clone $query)
                ->where('debrief_problems.debrief_problem_category_id', $category->id)
                ->select('debrief_problems.id', 'debrief_problems.title', 'debrief_problem_project_debrief.severity', 'debrief_problems.usage_count')
                ->get();

            $severityCounts = [
                'low'      => 0,
                'medium'   => 0,
                'high'     => 0,
                'critical' => 0,
            ];

            $totalWeight = 0;
            $problems    = [];
            foreach ($categoryProblems as $problem) {
                $severityCounts[$problem->severity]++;
                $totalWeight += $severityWeights[$problem->severity];
                $problems[] = ['id' => $problem->id, 'title' => $problem->title, 'severity' => $problem->severity, 'usage_count' => $problem->usage_count ?? 0];
            }

            $result[] = [
                'category_id'     => $category->id,
                'category_name'   => $category->name,
                'category_color'  => $category->color,
                'category_icon'   => $category->icon,
                'total_problems'  => count($categoryProblems),
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
            'id'            => $problem->id,
            'title'         => $problem->title,
            'category'      => $problem->category->name,
            'category_color'=> $problem->category->color,
            'usage_count'   => $problem->usage_count,
        ])->toArray();
    }
    public function getTopSolutions(int $limit = 10): array {
        return DebriefSolution::orderByEffectiveness('desc')
            ->orderByUsage('desc')
            ->limit($limit)
            ->get()
            ->map(fn ($solution) => [
                'id'                  => $solution->id,
                'title'               => $solution->title,
                'avg_effectiveness'   => round($solution->avg_effectiveness_rating ?? 0, 2),
                'usage_count'         => $solution->usage_count,
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
        $query = DebriefPositive::with('category')
            ->select('title', 'debrief_problem_category_id', 'id', DB::raw('COUNT(*) as count'))
            ->groupBy('title', 'debrief_problem_category_id')
            ->orderByDesc('count')
            ->limit($limit);

        if (isset($filters['category_id'])) {
            $query->where('debrief_problem_category_id', $filters['category_id']);
        }

        if (isset($filters['from_date']) || isset($filters['to_date'])) {
            $debriefIds = DebriefProjectDebrief::query()
                ->when(isset($filters['from_date']), fn ($q) => $q->where('conducted_at', '>=', $filters['from_date']))
                ->when(isset($filters['to_date']), fn ($q) => $q->where('conducted_at', '<=', $filters['to_date']))
                ->pluck('id');
            $query->whereIn('debrief_project_debrief_id', $debriefIds);
        }

        return $query->get()->map(fn ($positive) => [
            'id'             => $positive->id,
            'title'          => $positive->title,
            'category'       => $positive->category?->name,
            'category_color' => $positive->category?->color,
            'count'          => $positive->count,
        ])->toArray();
    }
    public function getCategoryBreakdownPositives(array $filters = []): array {
        $categories = DebriefProblemCategory::orderBy('position')->get();

        $query = DebriefPositive::query()
            ->join('debrief_project_debriefs', 'debrief_positives.debrief_project_debrief_id', '=', 'debrief_project_debriefs.id');

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
                'category_id'    => $category->id,
                'category_name'  => $category->name,
                'category_color' => $category->color,
                'category_icon'  => $category->icon,
                'total_positives' => $total,
            ];
        }

        return $result;
    }
}
