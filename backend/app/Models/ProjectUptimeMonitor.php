<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class ProjectUptimeMonitor extends Pivot {
    protected $table = 'project_uptime_monitor';
    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
}
