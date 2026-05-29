<?php

namespace App\Console\Commands;

use App\Models\FloatParam;
use App\Models\Invoice;
use App\Models\Param;
use Carbon\Carbon;
use Illuminate\Console\Command;

class BackfillForecastRevenue12 extends Command {
    protected $signature   = 'stats:backfill-forecast-revenue12 {--dry-run : Preview without writing}';
    protected $description = 'Finds forecast history months missing revenue_12 and backfills global INVOICE_REVENUE_12M for those months';

    public function handle(): int {
        $dryRun = $this->option('dry-run');

        $forecastParam = Param::where('key', 'STATS_LINREG_FORECAST_12M')->first();
        if (! $forecastParam) {
            $this->error('STATS_LINREG_FORECAST_12M param not found.');
            return 1;
        }

        $revenueParam = Param::where('key', 'INVOICE_REVENUE_12M')->first();
        if (! $revenueParam) {
            $this->error('INVOICE_REVENUE_12M param not found.');
            return 1;
        }

        // Distinct months covered by the forecast history
        $forecastMonths = FloatParam::where('param_id', $forecastParam->id)
            ->whereNull('parent_id')
            ->orderBy('created_at')
            ->get()
            ->map(fn ($r) => Carbon::parse($r->created_at)->format('Y-m'))
            ->unique()
            ->values();

        $this->info("Forecast months found: {$forecastMonths->count()}");

        // Months covered by the global INVOICE_REVENUE_12M history
        $existingRevenueMonths = FloatParam::where('param_id', $revenueParam->id)
            ->whereNull('parent_id')
            ->get()
            ->map(fn ($r) => Carbon::parse($r->created_at)->format('Y-m'))
            ->unique()
            ->values()
            ->toArray();

        $this->info('Existing global INVOICE_REVENUE_12M months: '.count($existingRevenueMonths));

        // For each forecast month F, revenue_12 needs a global INVOICE_REVENUE_12M record at F+1Y.
        // ForecastStatisticsService subtracts P1Y from the record's created_at to align it with F.
        $missing = [];
        foreach ($forecastMonths as $forecastMonth) {
            $targetMonth = Carbon::parse($forecastMonth)->addYear()->format('Y-m');

            if (in_array($targetMonth, $existingRevenueMonths)) {
                continue;
            }

            // Only backfill months that are fully in the past
            if (Carbon::parse($targetMonth)->startOfMonth()->isFuture()) {
                continue;
            }

            $missing[] = $targetMonth;
        }

        if (empty($missing)) {
            $this->info('No missing months — nothing to backfill.');
            return 0;
        }

        $this->info('Missing months to backfill ('.count($missing).'): '.implode(', ', $missing));

        if ($dryRun) {
            foreach ($missing as $targetMonth) {
                $asOf    = Carbon::parse($targetMonth)->endOfMonth();
                $revenue = $this->computeRevenue($asOf);
                $this->line(sprintf('  [dry-run] %s → %.2f', $targetMonth, $revenue));
            }
            return 0;
        }

        foreach ($missing as $targetMonth) {
            $asOf    = Carbon::parse($targetMonth)->endOfMonth();
            $revenue = $this->computeRevenue($asOf);

            FloatParam::create([
                'param_id'    => $revenueParam->id,
                'value'       => $revenue,
                'parent_id'   => null,
                'parent_type' => null,
                'created_at'  => Carbon::parse($targetMonth)->startOfMonth(),
                'updated_at'  => Carbon::parse($targetMonth)->startOfMonth(),
            ]);

            $this->line(sprintf('  Backfilled %s: %.2f', $targetMonth, $revenue));
        }

        $this->info('Done.');
        return 0;
    }

    private function computeRevenue(Carbon $asOf): float {
        return Invoice::whereBetween('created_at', [$asOf->copy()->subYear(), $asOf])
            ->where(fn ($q) => $q->where('is_cancelled', false)->orWhereNull('is_cancelled'))
            ->get()
            ->append('net')
            ->sum('net');
    }
}
