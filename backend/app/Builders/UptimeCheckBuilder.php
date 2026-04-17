<?php

namespace App\Builders;

use Carbon\Carbon;

class UptimeCheckBuilder extends BaseBuilder {
    public function dailyStats(Carbon $since): UptimeCheckBuilder {
        return $this
            ->selectRaw("DATE(checked_at) as day, SUM(status = 'up') as up_count, SUM(status = 'down') as down_count, SUM(status = 'degraded') as degraded_count, COUNT(*) as total")
            ->where('checked_at', '>=', $since)
            ->groupBy('day')
            ->reorder('day', 'asc');
    }
}
