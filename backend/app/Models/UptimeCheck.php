<?php

namespace App\Models;

use App\Builders\UptimeCheckBuilder;

class UptimeCheck extends BaseModel {
    public function newEloquentBuilder($query): UptimeCheckBuilder {
        return new UptimeCheckBuilder($query);
    }

    public $timestamps  = false;
    protected $appends  = [];
    protected $fillable = [
        'uptime_monitor_id',
        'checked_at',
        'status',
        'response_time',
        'status_code',
        'error_message',
    ];
    protected $casts = [
        'checked_at' => 'datetime',
    ];

    public function monitor() {
        return $this->belongsTo(UptimeMonitor::class, 'uptime_monitor_id');
    }
}
