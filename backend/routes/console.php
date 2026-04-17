<?php

use App\Services\SentinelTriggerService;
use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('webhooks:add-missing')->everyTenMinutes();
Schedule::command('cron:standing-orders')->daily();
Schedule::command('cron:cashflow')->daily();
Schedule::command('cron:add-company-news-comments')->daily();
Schedule::command('cron:update-lead-probability')->daily();
Schedule::command('cron:support-regression')->monthly();
Schedule::command('cron:linear-regression-forecast')->monthly();
Schedule::command('cron:monthly-stats')->monthly();
Schedule::command('vacation:update-status')->daily();
Schedule::command('assignments:reset-finished-projects')->daily();
Schedule::command('assignments:compute-timebased-averages')->daily();
Schedule::command('timetracker:reset-idle')->everyMinute();
Schedule::command('git:detect-frameworks')->daily();
Schedule::command('git:detect-frameworks', ['--fresh'])->weekly();
Schedule::command('git:fetch-latest-framework-versions')->daily();
Schedule::command('cron:uptime-monitor')->everyFiveMinutes();
Schedule::command('cron:check-project-work-thresholds')->daily();
Schedule::command('chat:clean-pipeline-posts')->daily();

foreach (['00:00', '08:00', '12:00', '17:00'] as $time) {
    Schedule::call(function () use ($time) {
        SentinelTriggerService::handleScheduleBasedTriggers($time);
    })->daily()->at($time);
}
