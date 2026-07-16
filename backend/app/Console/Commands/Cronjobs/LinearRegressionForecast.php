<?php

namespace App\Console\Commands\Cronjobs;

use App\Services\ForecastService;
use Carbon\Carbon;
use Illuminate\Console\Command;

class LinearRegressionForecast extends Command {
    protected $signature   = 'cron:linear-regression-forecast {--date= : Evaluation date (Y-m-d format, defaults to now)} {--store=true : Store results in parameters}';
    protected $description = 'Linear regression forecast to predict revenue based on historic variables';

    public function __construct(private ForecastService $forecastService) {
        parent::__construct();
    }

    public function handle(): int {
        $evaluationDate = $this->option('date')
            ? Carbon::parse($this->option('date'))
            : Carbon::now();

        $shouldStore = filter_var($this->option('store'), FILTER_VALIDATE_BOOLEAN);

        return $this->forecastService->execute($evaluationDate, $shouldStore, $this);
    }
    public function runAnalysis(?Carbon $evaluationDate = null, bool $shouldStore = true): ?array {
        return $this->forecastService->runAnalysis($evaluationDate, $shouldStore);
    }
}
