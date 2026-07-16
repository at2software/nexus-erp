<?php

namespace App\Console\Commands\Cronjobs;

use App\Mail\ProjectPredictedOverrunAlert;
use App\ML\ProjectEarlyWarningModel;
use App\Models\Param;
use App\Models\Project;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class CheckProjectOverrunPredictions extends Command {
    protected $signature   = 'cron:check-project-overrun-predictions';
    protected $description = 'Refresh Model 2 predictions (projects.ml_predicted_hours) for running projects, and alert project managers when a predicted overrun crosses a configured threshold';

    public function handle(): int {
        if (! ProjectEarlyWarningModel::load()) {
            $this->warn('No trained early-warning model found — run ml:train-project-early-warning first. Skipping.');
            return 0;
        }

        $thresholds = json_decode(Param::get('PROJECT_PREDICTED_OVERRUN_THRESHOLDS', [], true)?->value ?? '[]', true);
        sort($thresholds);

        $projects = Project::whereRunning()
            ->whereNot('is_time_based', true)
            ->whereNot('is_internal', true)
            ->whereNotNull('work_estimated')
            ->where('work_estimated', '>', 0)
            ->with(['projectManager', 'hoursInvestedSum'])
            ->get();

        $this->info("Updating predictions for {$projects->count()} running projects...");

        foreach ($projects as $project) {
            $predictedFinal = ProjectEarlyWarningModel::predictFinal($project);
            if ($predictedFinal === null) {
                continue; // e.g. no started_at yet
            }

            $project->ml_predicted_hours = $predictedFinal;
            $project->ml_predicted_at    = now();
            $project->save();

            if (empty($thresholds)) {
                continue;
            }
            $this->checkThresholds($project, $thresholds, $predictedFinal);
        }

        $this->info('Done.');
        return 0;
    }
    private function checkThresholds(Project $project, array $thresholds, float $predictedFinal): void {
        $ratio = $predictedFinal / $project->work_estimated;

        $notifiedParam = $project->param('PROJECT_PREDICTED_OVERRUN_NOTIFIED', false);
        $notified      = json_decode($notifiedParam->value ?? '[]', true) ?? [];
        $changed       = false;

        foreach ($thresholds as $threshold) {
            $exceeded = ($ratio * 100) >= $threshold;

            if ($exceeded && ! in_array($threshold, $notified)) {
                $this->sendAlert($project, $threshold, $predictedFinal);
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
    private function sendAlert(Project $project, int $threshold, float $predictedFinal): void {
        $manager = $project->projectManager;
        if (! $manager?->email) {
            $this->warn("  ⚠ Project #{$project->id} has no project manager email, skipping threshold {$threshold}%");
            return;
        }

        try {
            Mail::to($manager->email)->send(new ProjectPredictedOverrunAlert($project, $threshold, $predictedFinal));
            $this->info("  ✉ Sent {$threshold}% predicted-overrun alert for \"{$project->name}\" to {$manager->email}");
        } catch (\Exception $e) {
            $this->error("  ✗ Failed to send alert for \"{$project->name}\": {$e->getMessage()}");
        }
    }
}
