<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

class UptimeMonitorUser extends Pivot {
    protected $table = 'uptime_monitor_user';
    protected $casts = [
        'notify_via_email'    => 'boolean',
        'notify_via_chat'     => 'boolean',
        'notify_on_recovery'  => 'boolean',
        'created_at'          => 'datetime',
        'updated_at'          => 'datetime',
    ];
}
