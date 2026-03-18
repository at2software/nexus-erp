<?php

namespace App\Console\Commands\Cronjobs;

use App\Models\UptimeMonitor as UptimeMonitorModel;
use App\Services\UptimeCheckService;
use App\Services\UptimeNotificationService;
use Illuminate\Console\Command;

class UptimeMonitor extends Command {
    protected $signature   = 'cron:uptime-monitor {--cleanup-days= : Cleanup checks older than X days}';
    protected $description = 'Check all active uptime monitors (runs every 5 minutes)';

    public function handle(UptimeCheckService $checkService, UptimeNotificationService $notificationService) {
        $this->info('Starting uptime monitoring checks...');

        $monitors = UptimeMonitorModel::where('is_active', true)->get();

        if ($monitors->isEmpty()) {
            $this->info('No active monitors to check.');
            return 0;
        }

        $checksPerformed   = 0;
        $notificationsSent = 0;

        foreach ($monitors as $monitor) {
            try {
                $check = $checkService->performCheck($monitor);
                $checksPerformed++;

                $this->line("Checked {$monitor->name}: {$check->status} ({$check->response_time}ms)");

                if ($checkService->shouldNotify($monitor, $check)) {
                    $notificationService->notifyDown($monitor, $check);
                    $notificationsSent++;
                    $this->warn("  → Sent down notification for {$monitor->name}");
                } elseif ($checkService->shouldNotifyRecovery($monitor, $check)) {
                    $notificationService->notifyRecovery($monitor, $check);
                    $notificationsSent++;
                    $this->info("  → Sent recovery notification for {$monitor->name}");
                }
            } catch (\Exception $e) {
                $this->error("Failed to check monitor {$monitor->id}: ".$e->getMessage());
            }
        }

        $this->info("Completed {$checksPerformed} checks, sent {$notificationsSent} notifications.");

        if ($cleanupDays = $this->option('cleanup-days')) {
            $deleted = $checkService->cleanupOldChecks((int)$cleanupDays);
            $this->info("Cleaned up {$deleted} old check records.");
        }

        return 0;
    }
}
