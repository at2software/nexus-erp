<?php

namespace Database\Seeders;

use Carbon\Carbon;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Artisan;

class LinearRegressionForecastSeeder extends Seeder {
    use WithoutModelEvents;

    /**
     * Run the database seeds.
     */
    public function run(): void {
        $this->command->info('Seeding Linear Regression Forecast data for the last 36 months...');

        // Simulate analysis for each of the last 36 months
        $endMonth   = Carbon::now();
        $startMonth = $endMonth->copy()->subMonths(35); // Go back 36 months total

        $currentMonth = $startMonth->copy();
        $monthCount   = 0;

        while ($currentMonth->lte($endMonth)) {
            $monthCount++;
            $this->command->info("Processing month {$monthCount}/36: ".$currentMonth->format('Y-m'));

            try {
                // Call the linear regression command with the specific date and store=true
                $exitCode = Artisan::call('cron:linear-regression-forecast', [
                    '--date'  => $currentMonth->format('Y-m-d'),
                    '--store' => 'true',
                ]);

                if ($exitCode !== 0) {
                    $this->command->warn('Command failed for '.$currentMonth->format('Y-m')." (exit code: {$exitCode})");
                }
            } catch (\Exception $e) {
                $this->command->error('Error processing '.$currentMonth->format('Y-m').': '.$e->getMessage());
            }

            $currentMonth->addMonth();
        }

        $this->command->info("✅ Successfully seeded linear regression forecast data for {$monthCount} months");
        $this->command->info('You can now view the historical data using the STATS_LINREG_* parameters');
    }
}
