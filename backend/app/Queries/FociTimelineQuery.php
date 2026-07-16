<?php

namespace App\Queries;

use App\Enums\ClusterType;
use Carbon\Carbon;
use Closure;
use Illuminate\Support\Collection;

class FociTimelineQuery {
    /** @param Closure $foci Returns a fresh Focus query/relation builder each call. */
    public function __construct(private Closure $foci) {}

    public function get(): Collection {
        [$min, $max, $cluster] = $this->getFociDateRange();
        $users                 = $this->getFociUsers();
        $data                  = $this->mapUsersToClusterData($users, $cluster);
        return $this->fillGapsInUserData($data, $min, $max, $cluster);
    }
    private function getFociDateRange(): array {
        $min     = Carbon::parse(($this->foci)()->min('started_at'));
        $max     = Carbon::parse(($this->foci)()->max('started_at'));
        $cluster = ClusterType::getType($min, $max);
        return [$min, $max, $cluster];
    }
    private function getFociUsers(): Collection {
        return ($this->foci)()->groupBy('user_id')->get();
    }
    private function mapUsersToClusterData(Collection $users, ClusterType $cluster): Collection {
        return $users->map(fn ($_) => [
            'user' => $_->user->only(['name', 'color', 'id']),
            'data' => ($this->foci)()
                ->where('user_id', $_->user->id)
                ->clusterBy('started_at', $cluster->toString(), sumColumn: 'duration')
                ->oldest('started_at')
                ->get()
                ->map(fn ($x) => ['period' => $x->month, 'value' => $x->sum]),
        ]);
    }
    private function fillGapsInUserData(Collection $data, Carbon $min, Carbon $max, ClusterType $cluster): Collection {
        foreach ($data as &$user) {
            for ($date = $min->copy(); $date < $max; $cluster->increase($date)) {
                $day = $date->format($cluster->toCarbonFormat());
                if (! $this->collectionContains($user['data'], fn ($_) => $_['period'] === $day)) {
                    $user['data']->push(['period' => $day, 'value' => 0]);
                }
            }
            $user['data'] = $user['data']->sortBy('period');
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
