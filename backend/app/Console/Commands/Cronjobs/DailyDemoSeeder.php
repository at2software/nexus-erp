<?php

namespace App\Console\Commands\Cronjobs;

use Carbon\Carbon;
use Database\Seeders\DemoSeeder;
use Illuminate\Console\Command;

class DailyDemoSeeder extends Command {
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cron:daily-demo-seeder';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Simulates the DemoSeeder for the current day';

    /**
     * Execute the console command.
     */
    public function handle() {
        $demoSeeder = new DemoSeeder;
        $demoSeeder->dailyActivity(Carbon::now());
    }
}
