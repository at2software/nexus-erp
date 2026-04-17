<?php

namespace App\Console\Commands;

use App\Actions\UpdateInvoiceStatisticsAction;
use App\Models\Company;
use Illuminate\Console\Command;

class RecalculateInvoiceStats extends Command {
    protected $signature   = 'stats:recalculate-invoice';
    protected $description = 'Recalculates INVOICE_REVENUE_12M and INVOICE_DEG_12M for all companies and globally';

    public function handle(): int {
        $action = app(UpdateInvoiceStatisticsAction::class);

        $this->info('Updating global stats...');
        $action->execute();

        $companies = Company::all();
        $this->info("Updating {$companies->count()} companies...");

        $bar = $this->output->createProgressBar($companies->count());
        $bar->start();

        foreach ($companies as $company) {
            $action->execute($company);
            $bar->advance();
        }

        $bar->finish();
        $this->newLine();
        $this->info('Done.');
        return 0;
    }
}
