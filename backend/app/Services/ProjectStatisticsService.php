<?php

namespace App\Services;

use App\Enums\InvoiceItemType;
use App\Models\ProductGroup;
use App\Models\Project;
use App\Models\ProjectState;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ProjectStatisticsService {
    public static function getProductMix(Carbon $start, Carbon $end): array {
        $projectIds = Project::whereFinishedSuccessfull()
            ->whereRelation('states', 'project_project_state.created_at', '>=', $start)
            ->whereRelation('states', 'project_project_state.created_at', '<=', $end)
            ->pluck('id');

        if ($projectIds->isEmpty()) {
            return ['total' => 0, 'groups' => [], 'unassigned' => ['count' => 0, 'net' => 0.0], 'timeline' => []];
        }

        $finishedAtByProject = DB::table('project_project_state as pps')
            ->join('project_states as ps', 'ps.id', '=', 'pps.project_state_id')
            ->whereIn('pps.project_id', $projectIds)
            ->where('ps.progress', ProjectState::Finished)
            ->where('ps.is_successful', true)
            ->whereBetween('pps.created_at', [$start, $end])
            ->groupBy('pps.project_id')
            ->selectRaw('pps.project_id, MAX(pps.created_at) as finished_at')
            ->pluck('finished_at', 'project_id');

        $items = DB::table('invoice_items')
            ->whereIn('project_id', $projectIds)
            ->whereIn('type', array_map(fn ($e) => $e->value, InvoiceItemType::ProjectTotal))
            ->whereNotNull('product_source_id')
            ->select('project_id', 'product_source_id', 'net')
            ->get();

        $productSourceIds        = $items->pluck('product_source_id')->unique()->values();
        $productGroupIdBySources = DB::table('products')->whereIn('id', $productSourceIds)->pluck('product_group_id', 'id');
        $rootGroupMap             = ProductGroup::buildRootGroupMap();

        $netByProject = [];
        foreach ($items as $item) {
            $groupId = $productGroupIdBySources->get($item->product_source_id);
            $root    = $groupId ? ($rootGroupMap[(int)$groupId] ?? null) : null;
            if (! $root) {
                continue;
            }
            $netByProject[$item->project_id][$root->id] ??= ['group' => $root, 'net' => 0.0];
            $netByProject[$item->project_id][$root->id]['net'] += (float)$item->net;
        }

        $groupTotals     = [];
        $unassignedCount = 0;
        $unassignedNet   = 0.0;
        $timeline        = [];

        foreach ($projectIds as $projectId) {
            $candidates = $netByProject[$projectId] ?? [];
            $winner     = collect($candidates)->sortByDesc('net')->first();
            $month      = isset($finishedAtByProject[$projectId]) ? Carbon::parse($finishedAtByProject[$projectId])->format('Y-m') : null;

            if (! $winner) {
                $unassignedCount++;
                $projectNet     = array_sum(array_column($candidates, 'net'));
                $unassignedNet += $projectNet;
                $groupKey       = 'unassigned';
            } else {
                $gid                  = $winner['group']->id;
                $groupTotals[$gid]  ??= ['id' => $gid, 'name' => $winner['group']->name, 'color' => $winner['group']->color, 'count' => 0, 'net' => 0.0];
                $groupTotals[$gid]['count']++;
                $groupTotals[$gid]['net'] += $winner['net'];
                $groupKey  = $gid;
                $projectNet = $winner['net'];
            }

            if ($month) {
                $timeline[$month][$groupKey]['count']  = ($timeline[$month][$groupKey]['count'] ?? 0) + 1;
                $timeline[$month][$groupKey]['net']    = ($timeline[$month][$groupKey]['net'] ?? 0.0) + $projectNet;
            }
        }

        ksort($timeline);

        return [
            'total'      => $projectIds->count(),
            'groups'     => array_values($groupTotals),
            'unassigned' => ['count' => $unassignedCount, 'net' => round($unassignedNet, 2)],
            'timeline'   => collect($timeline)->map(fn ($groups, $period) => ['period' => $period, 'groups' => $groups])->values(),
        ];
    }

    public static function getSuccessRate(Carbon $start, Carbon $end): array {
        $rows = DB::table('project_project_state as pps')
            ->join('project_states as ps', 'ps.id', '=', 'pps.project_state_id')
            ->where('ps.progress', ProjectState::Finished)
            ->where('ps.is_in_stats', true)
            ->whereBetween('pps.created_at', [$start, $end])
            ->orderByDesc('pps.id')
            ->select('pps.project_id', 'ps.is_successful')
            ->get()
            ->unique('project_id');

        $successful   = $rows->where('is_successful', true)->count();
        $unsuccessful = $rows->count() - $successful;

        return ['successful' => $successful, 'unsuccessful' => $unsuccessful];
    }

    public static function getQuoteAccuracy(Carbon $start, Carbon $end): array {
        $q = Project::whereHas('states', fn ($q) => $q
            ->where('progress', ProjectState::Finished)
            ->where('is_successful', true)
        )
            ->whereRelation('states', 'project_project_state.created_at', '>', $start)
            ->whereRelation('states', 'project_project_state.created_at', '<', $end)
            ->where('net', '>', 0);

        $results      = $q->get();
        $data         = [];
        $SUBDIVISIONS = 2;
        foreach ($results as $r) {
            $range = floor($SUBDIVISIONS * log10($r->net));
            if (empty($data[$range])) {
                $data[$range] = ['net' => $range, 'values' => []];
            }
            if ($r->quote_accuracy > 0) {
                $data[$range]['values'][] = $r->quote_accuracy * 100;
            }
        }
        foreach ($data as &$d) {
            $d['stddev']  = self::stddev($d['values']);
            $d['min']     = min($d['values']);
            $d['max']     = max($d['values']);
            $d['average'] = array_sum($d['values']) / count($d['values']);
            unset($d['values']);
        }
        usort($data, fn ($a, $b): float|int => $a['net'] - $b['net']);
        return array_values($data);
    }
    protected static function stddev($arr) {
        $num_of_elements = count($arr);
        $variance        = 0.0;
        $average         = array_sum($arr) / $num_of_elements;
        foreach ($arr as $i) {
            $variance += pow(($i - $average), 2);
        }
        return (float)sqrt($variance / $num_of_elements);
    }
}
