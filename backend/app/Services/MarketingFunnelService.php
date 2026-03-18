<?php

namespace App\Services;

use App\Models\ProjectState;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class MarketingFunnelService {
    public static function getFunnelChart(Builder $query): array {
        $projectIds = (clone $query)->pluck('id');

        if ($projectIds->isEmpty()) {
            return ['nodes' => [], 'links' => []];
        }

        $transitions = DB::table('project_project_state as pps1')
            ->join('project_project_state as pps2', 'pps1.project_id', '=', 'pps2.project_id')
            ->join('projects', 'projects.id', '=', 'pps1.project_id')
            ->whereIn('pps1.project_id', $projectIds)
            ->where('pps1.created_at', '<', DB::raw('pps2.created_at'))
            ->whereRaw('NOT EXISTS (
                SELECT 1 FROM project_project_state pps3
                WHERE pps3.project_id = pps1.project_id
                AND pps3.created_at > pps1.created_at
                AND pps3.created_at < pps2.created_at
            )')
            ->select(
                'pps1.project_state_id as from_state',
                'pps2.project_state_id as to_state',
                DB::raw('COUNT(DISTINCT pps1.project_id) as count'),
                DB::raw('SUM(DISTINCT projects.net) as net')
            )
            ->groupBy('from_state', 'to_state')
            ->get();

        $allStateIds = DB::table('project_project_state')
            ->whereIn('project_id', $projectIds)
            ->distinct()
            ->pluck('project_state_id');

        $states = ProjectState::whereIn('id', $allStateIds)->get()->keyBy('id');

        $links = $transitions->map(fn ($t) => [
            'source' => $t->from_state,
            'target' => $t->to_state,
            'count'  => $t->count,
            'net'    => floatval($t->net ?? 0),
        ])->values();

        $nodes = $states->map(fn ($state) => [
            'id'          => $state->id,
            'name'        => $state->name,
            'color'       => $state->color,
            'is_finished' => $state->progress === ProjectState::Finished,
        ])->values();
        return [
            'nodes' => $nodes,
            'links' => $links,
        ];
    }
    public static function applyRequestFilters(Builder $builder, Request $request): void {
        $request->validate([
            'created_after'  => 'nullable|date',
            'created_before' => 'nullable|date',
        ]);
        if ($request->has('created_after')) {
            $builder->whereAfter(Carbon::parse($request->created_after));
        }
        if ($request->has('created_before')) {
            $builder->whereBefore(Carbon::parse($request->created_before));
        }
    }
}
