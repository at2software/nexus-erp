<?php

namespace App\Console\Commands\Cronjobs;

use Illuminate\Console\Command;

/**
 * Runs every ml:train-* command in sequence. routes/console.php schedules
 * only this command weekly (not the seven individually) — it's also the
 * single command to run everything by hand instead of one-by-one.
 */
class TrainAllModels extends Command {
    protected $signature   = 'ml:train-all {--dry-run : Pass --dry-run through to every model}';
    protected $description = 'Train every Rubix ML model in this app (runs each ml:train-* command in sequence)';

    private const COMMANDS = [
        'ml:train-project-hours',
        'ml:train-project-early-warning',
        'ml:train-project-quote-acceptance',
        'ml:train-customer-revenue',
        'ml:train-customer-interval',
        'ml:train-customer-churn',
        'ml:train-support-load',
    ];

    public function handle(): int {
        $options = $this->option('dry-run') ? ['--dry-run' => true] : [];
        $failed  = [];

        foreach (self::COMMANDS as $command) {
            $this->line('');
            $this->info("===== {$command} =====");
            if ($this->call($command, $options) !== 0) {
                $failed[] = $command;
                $this->error("{$command} failed — continuing with the rest.");
            }
        }

        $this->line('');
        if (empty($failed)) {
            $this->info('All models trained.');
            return 0;
        }
        $this->error('Failed: '.implode(', ', $failed));
        return 1;
    }
}
