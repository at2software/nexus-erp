<?php

namespace App\Console\Commands\Cronjobs;

use App\Mail\ProjectWorkThresholdAlert;
use App\Models\Param;
use App\Models\Project;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class CheckProjectWorkThresholds extends Command {
    protected $signature   = 'cron:check-project-work-thresholds';
    protected $description = 'Send email alerts to project managers when hours invested exceed configured thresholds';

    public function handle(): int {
        $thresholds = json_decode(Param::get('PROJECT_WORK_THRESHOLDS', [], true)?->value ?? '[]', true);
        if (empty($thresholds)) {
            $this->info('No work thresholds configured, skipping.');
            return 0;
        }
        sort($thresholds);

        $projects = Project::whereRunning()
            ->whereNot('is_time_based', true)
            ->whereNotNull('project_manager_id')
            ->whereNotNull('work_estimated')
            ->where('work_estimated', '>', 0)
            ->with(['projectManager', 'hoursInvestedSum'])
            ->get();

        $this->info("Checking work thresholds for {$projects->count()} projects...");

        foreach ($projects as $project) {
            $ratio         = $project->hours_invested / $project->work_estimated;
            $notifiedParam = $project->param('PROJECT_WORK_THRESHOLD_NOTIFIED', false);
            $notified      = json_decode($notifiedParam->value ?? '[]', true) ?? [];
            $changed       = false;

            foreach ($thresholds as $threshold) {
                $exceeded = ($ratio * 100) >= $threshold;

                if ($exceeded && ! in_array($threshold, $notified)) {
                    $this->sendAlert($project, $threshold, $ratio);
                    $notified[] = $threshold;
                    $changed    = true;
                } elseif (! $exceeded && in_array($threshold, $notified)) {
                    $notified = array_values(array_diff($notified, [$threshold]));
                    $changed  = true;
                }
            }

            if ($changed) {
                $notifiedParam->value = json_encode($notified);
                $notifiedParam->save();
            }
        }

        $this->info('Done.');
        return 0;
    }
    private function sendAlert(Project $project, int $threshold, float $ratio): void {
        $manager = $project->projectManager;
        if (! $manager?->email) {
            $this->warn("  ⚠ Project #{$project->id} has no project manager email, skipping threshold {$threshold}%");
            return;
        }

        try {
            Mail::to($manager->email)->send(new ProjectWorkThresholdAlert($project, $threshold, $ratio));
            $this->info("  ✉ Sent {$threshold}% alert for \"{$project->name}\" to {$manager->email}");
        } catch (\Exception $e) {
            $this->error("  ✗ Failed to send alert for \"{$project->name}\": {$e->getMessage()}");
        }
    }
}
