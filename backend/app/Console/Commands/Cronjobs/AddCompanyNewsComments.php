<?php

namespace App\Console\Commands\Cronjobs;

use App\Enums\CommentType;
use App\Helpers\Bundesanzeiger;
use App\Helpers\HandelsRegister;
use App\Models\Company;
use Carbon\Carbon;
use Illuminate\Console\Command;

class AddCompanyNewsComments extends Command {
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'cron:add-company-news-comments';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Adds comments to companies based on news from Handelsregister and Bundesanzeiger';

    /**
     * Execute the console command.
     */
    public function handle() {
        $companies      = Company::whereNotNull('commercial_register')->whereNot('is_deprecated', true)->get();
        $handelsRegister = app(HandelsRegister::class);
        $bundesanzeiger  = app(Bundesanzeiger::class);

        foreach ($companies as $company) {
            $commentCount = 0;
            $this->info('Processing: '.$company->name);

            // Check Handelsregister for insolvency
            $registerInfo = $handelsRegister->process($company->commercial_register);
            if (! empty($registerInfo) && ! empty($registerInfo['fehlerhaft'])) {
                $commentText = '[Handelsregister] Registernummer fehlerhaft: '.$company->commercial_register;

                if (! $company->comments()->where('text', $commentText)->exists()) {
                    $company->comments()->create([
                        'text'    => $commentText,
                        'user_id' => null,
                        'is_mini' => true,
                        'type'    => CommentType::Warning,
                        ...$company->toPoly(),
                    ]);
                    $commentCount++;
                }
            }
            if (! empty($registerInfo) && ! empty($registerInfo['insolvent'])) {
                $commentText = '[Handelsregister] Insolvenz erkannt!';

                if (! $company->comments()->where('text', $commentText)->exists()) {
                    $company->comments()->create([
                        'text'    => $commentText,
                        'user_id' => null,
                        'is_mini' => true,
                        'type'    => CommentType::Warning,
                        ...$company->toPoly(),
                    ]);
                    $commentCount++;
                }
            }

            // Check Bundesanzeiger for new publications (searched by company name)
            $reports = $bundesanzeiger->process($company->name);

            if (! empty($reports)) {
                foreach ($reports as $report) {
                    $parsedDate = Carbon::createFromFormat('d.m.Y', $report['date']);
                    if (! $parsedDate || $parsedDate->year < 2026) {
                        continue;
                    }

                    $commentText = '[Bundesanzeiger] '.$report['name'];

                    if (! $company->comments()->where('text', $commentText)->exists()) {
                        $company->comments()->create([
                            'text'    => $commentText,
                            'user_id' => null,
                            'is_mini' => true,
                            'type'    => CommentType::Notice,
                            ...$company->toPoly(),
                        ]);
                        $commentCount++;
                    }
                }
            }

            if ($commentCount > 0) {
                $this->info('  → '.$commentCount.' comment(s) added');
            }
        }

        $this->info('Done.');
    }
}
