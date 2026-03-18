<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UptimeCheck extends Model {
    use HasFactory;

    public $timestamps  = false;
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
