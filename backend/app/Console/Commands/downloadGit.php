<?php

namespace App\Console\Commands;

use App\Http\Controllers\PluginGitController;
use Illuminate\Console\Command;

class downloadGit extends Command {
    protected $signature   = 'app:download-git';
    protected $description = 'Command description';

    public function handle() {
        $git = app(PluginGitController::class);
        $git->downloadTest();
    }
}
