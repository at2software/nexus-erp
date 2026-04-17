<?php

namespace App\Console\Commands;

use App\Models\Company;
use App\Models\FloatParam;
use App\Models\Param;
use Carbon\Carbon;
use Illuminate\Console\Command;

class FixCompanyRevenue12M extends Command {
    protected $signature   = 'fix:company-revenue-12m {--dry-run : Preview changes without writing}';
    protected $description = 'Recalculates INVOICE_REVENUE_12M for all companies at each stored timestamp, excluding cancelled invoices';

    public function handle(): int {
        $dryRun = $this->option('dry-run');

        $revenueParam = Param::where('key', 'INVOICE_REVENUE_12M')->first();
        if (! $revenueParam) {
            $this->error('INVOICE_REVENUE_12M param not found.');
            return 1;
        }

        // All company-level entries, grouped by company
        $companyEntries = FloatParam::where('param_id', $revenueParam->id)
            ->where('parent_type', Company::class)
            ->whereNotNull('parent_id')
            ->orderBy('parent_id')
            ->orderBy('created_at')
            ->get(['id', 'parent_id', 'value', 'created_at']);

        $grouped = $companyEntries->groupBy('parent_id');

        $this->info("Found {$grouped->count()} companies with stored INVOICE_REVENUE_12M entries.");

        $fixed   = 0;
        $skipped = 0;

        foreach ($grouped as $companyId => $entries) {
            $company = Company::find($companyId);
            if (! $company) {
                $this->warn("  Company {$companyId} not found, skipping.");
                $skipped++;

                continue;
            }

            $this->line("  {$company->name} ({$companyId}): {$entries->count()} entries");

            $corrections = [];
            foreach ($entries as $entry) {
                $asOf          = Carbon::parse($entry->created_at);
                $correct       = $this->calculateRevenue($company, $asOf);
                $corrections[] = [
                    'id'         => $entry->id,
                    'created_at' => $entry->created_at,
                    'old'        => $entry->value,
                    'new'        => $correct,
                ];
                if (abs($correct - $entry->value) > 0.01) {
                    $this->line(sprintf(
                        '    %s: %.2f → %.2f',
                        $asOf->format('Y-m'),
                        $entry->value,
                        $correct
                    ));
                }
            }

            if (! $dryRun) {
                foreach ($corrections as $c) {
                    FloatParam::where('id', $c['id'])->update(['value' => $c['new']]);
                }
            }

            $fixed++;
        }

        $this->info($dryRun
            ? "Dry run complete. {$fixed} companies would be updated."
            : "Done. Updated {$fixed} companies, skipped {$skipped}."
        );
        return 0;
    }
    private function calculateRevenue(Company $company, Carbon $asOf): float {
        return $company->invoices()
            ->whereBetween('created_at', [$asOf->copy()->subYear(), $asOf])
            ->where(fn ($q) => $q->where('is_cancelled', false)->orWhereNull('is_cancelled'))
            ->get()
            ->append('net')
            ->sum('net');
    }
}
