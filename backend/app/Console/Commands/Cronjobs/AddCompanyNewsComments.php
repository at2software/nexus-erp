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
    protected $description = 'Command description';

    /**
     * Execute the console command.
     */
    public function handle() {
        return;
        $companyDataArray = $this->getCompanyDataAndInsolvency();
        foreach ($companyDataArray as $companyData) {
            $company            = $companyData['company'];
            $companyInformation = $companyData['information'];

            if ($companyInformation['insolvent']) {
                $commentText = 'Insolvenz erkannt!';

                $existingComment = $company->comments()->where('text', $commentText)->first();

                if (! $existingComment) {
                    $company->comments()->create([
                        'text'    => $commentText,
                        'user_id' => null,
                        'is_mini' => true,
                        'type'    => CommentType::Warning,
                        ...$company->toPoly(),
                    ]);
                }
            }

            $reports = $this->getReports($companyInformation);

            foreach ($reports as $report) {
                $commentText = $report['date'].' '.$report['name'].' '.$report['link'];

                $existingComment = $company->comments()->where('text', $commentText)->first();

                if (! $existingComment) {
                    $company->comments()->create([
                        'text'    => $commentText,
                        'user_id' => null,
                        'is_mini' => true,
                        'type'    => CommentType::Notice,
                        ...$company->toPoly(),
                    ]);
                }
            }
        }
    }

    private function getCompanyDataAndInsolvency() {
        $handelsRegister = app(HandelsRegister::class);
        $results         = [];
        foreach (Company::whereNotNull('commercial_register')->get() as $company) {
            $result = $handelsRegister->process($company->commercial_register);
            if (! empty($result)) {
                $results[] = ['company' => $company, 'information' => $result];
            }
        }
        return $results;
    }
    private function getReports($company) {
        $bundesanzeiger = app(Bundesanzeiger::class);

        $results = $bundesanzeiger->process(
            $company['name'].' '.$company['state'],
            '01.01.2023',
            Carbon::now()->format('d.m.Y')
        );
        return $results;
    }
}
