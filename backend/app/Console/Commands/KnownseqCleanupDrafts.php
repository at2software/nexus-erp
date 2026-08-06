<?php

namespace App\Console\Commands;

use App\Models\Company;
use Illuminate\Console\Command;

class KnownseqCleanupDrafts extends Command {
    protected $signature   = 'knownseq:cleanup-drafts {--hours=24 : Delete drafts older than this many hours}';
    protected $description = 'Delete abandoned KnownSeq draft (scratch) companies and their call data';

    public function handle() {
        $hours   = (int)$this->option('hours');
        $cutoff  = now()->subHours($hours > 0 ? $hours : 24);
        $drafts  = Company::whereDraft()->where('created_at', '<', $cutoff)->get();

        foreach ($drafts as $draft) {
            $draft->purgeDraft();
        }

        $this->info('Purged '.$drafts->count().' abandoned KnownSeq draft(s) older than '.$hours.'h.');
        return Command::SUCCESS;
    }
}
