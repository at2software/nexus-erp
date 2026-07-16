<?php

namespace App\Console\Commands;

use App\Services\ImprintScraperService;
use Illuminate\Console\Command;

class AnalyzeUrlImprint extends Command {
    protected $signature   = 'app:analyzeUrlImprint {url} {--existing-vcard=}';
    protected $description = 'Analyzes a URL for imprint pages and company information inside it';

    public function __construct(private ImprintScraperService $imprintScraperService) {
        parent::__construct();
    }

    public function handle(): int {
        $this->imprintScraperService->execute(
            $this->argument('url'),
            $this->option('existing-vcard'),
            $this
        );

        return self::SUCCESS;
    }
}
