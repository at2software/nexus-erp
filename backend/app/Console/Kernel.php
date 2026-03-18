<?php

namespace App\Console;

use App\Services\SentinelTriggerService;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Console\Kernel as ConsoleKernel;

class Kernel extends ConsoleKernel {
    /**
     * Define the application's command schedule.
     */
    protected function schedule(Schedule $schedule): void {
        $schedule->command('webhooks:add-missing')->everyTenMinutes();
        $schedule->command('cron:standing-orders')->daily();
        $schedule->command('cron:cashflow')->daily();
        $schedule->command('cron:add-company-news-comments')->daily();
        $schedule->command('cron:update-lead-probability')->daily();
        $schedule->command('cron:support-regression')->monthly();
        $schedule->command('cron:linear-regression-forecast')->monthly();
        $schedule->command('cron:monthly-stats')->monthly();
        $schedule->command('vacation:update-status')->daily();
        $schedule->command('assignments:reset-finished-projects')->daily();
        $schedule->command('assignments:compute-timebased-averages')->daily();
        $schedule->command('timetracker:reset-idle')->everyMinute();
        $schedule->command('git:detect-frameworks')->daily();
        $schedule->command('git:detect-frameworks --fresh')->weekly();
        $schedule->command('git:fetch-latest-framework-versions')->daily();
        $schedule->command('cron:uptime-monitor')->everyFiveMinutes();

        $sentinelTimes = ['00:00', '08:00', '12:00', '17:00'];
        foreach ($sentinelTimes as $time) {
            $schedule->call(function () use ($time) {
                SentinelTriggerService::handleScheduleBasedTriggers($time);
            })->daily()->at($time);
        }
    }

    /**
     * Register the commands for the application.
     */
    protected function commands(): void {
        $this->load(__DIR__.'/Commands');
        $this->load(__DIR__.'/Commands/Cronjobs');
        $this->load(__DIR__.'/Commands/Import');

        require base_path('routes/console.php');
    }
}
