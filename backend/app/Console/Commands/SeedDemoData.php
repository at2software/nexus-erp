<?php

namespace App\Console\Commands;

use Database\Seeders\DemoSeeder;
use Illuminate\Console\Command;

class SeedDemoData extends Command {
    protected $signature   = 'demo:seed';
    protected $description = 'Seed realistic demo data: 6-person software agency, 5 years of activity and param history';

    public function handle(): int {
        $this->warn('This will INSERT demo data into the current database.');
        $this->info('Run on a fresh migration (php artisan migrate:fresh) to avoid duplicate data.');

        if (! $this->confirm('Proceed?', true)) {
            $this->info('Aborted.');
            return self::FAILURE;
        }

        $this->info('Starting demo seed — this may take several minutes...');
        $start = now();

        $seeder = new DemoSeeder;
        $seeder->setContainer(app());
        $seeder->setCommand($this);
        $seeder->run();

        $elapsed = now()->diffInSeconds($start);
        $this->info("Done in {$elapsed}s.");
        $this->info('Login: anna.mueller@digitech-demo.com / password');

        return self::SUCCESS;
    }
}
