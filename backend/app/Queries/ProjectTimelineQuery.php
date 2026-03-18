<?php

namespace App\Queries;

use App\Enums\ClusterType;
use App\Models\Project;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class ProjectTimelineQuery {
    public function __construct(private Project $project) {}

    public function get(): Collection {
        [$min, $max, $cluster] = $this->getFociDateRange();
        $users                 = $this->getFociUsers();
        $data                  = $this->mapUsersToClusterData($users, $cluster);
        return $this->fillGapsInUserData($data, $min, $max, $cluster);
    }
    private function getFociDateRange(): array {
        $min     = Carbon::parse($this->project->foci()->min('started_at'));
        $max     = Carbon::parse($this->project->foci()->max('started_at'));
        $cluster = ClusterType::getType($min, $max);
        return [$min, $max, $cluster];
    }
    private function getFociUsers(): Collection {
        return $this->project->foci()->groupBy('user_id')->get();
    }
    private function mapUsersToClusterData(Collection $users, ClusterType $cluster): Collection {
        return $users->map(fn ($_) => [
            'user' => $_->user->only(['name', 'color', 'id']),
            'data' => $this->project->foci()
                ->where('user_id', $_->user->id)
                ->clusterBy('started_at', $cluster->toString(), sumColumn: 'duration')
                ->oldest('started_at')
                ->get()
                ->map(fn ($x) => $x->only('month', 'sum')),
        ]);
    }
    private function fillGapsInUserData(Collection $data, Carbon $min, Carbon $max, ClusterType $cluster): Collection {
        foreach ($data as &$user) {
            for ($date = $min->copy(); $date < $max; $cluster->increase($date)) {
                $day = $date->format($cluster->toCarbonFormat());
                if (! $this->collectionContains($user['data'], fn ($_) => $_['month'] === $day)) {
                    $user['data']->push(['month' => $day, 'sum' => 0]);
                }
            }
            $user['data'] = $user['data']->sortBy('month');
        }
        return $data;
    }
    private function collectionContains(Collection $collection, callable $callback): bool {
        foreach ($collection as $item) {
            if ($callback($item)) {
                return true;
            }
        }
        return false;
    }
}
