<?php

namespace App\Jobs;

use App\Http\Controllers\PluginChatController;
use App\Http\Controllers\PluginController;
use App\Models\Project;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * @method static \Illuminate\Foundation\Bus\PendingDispatch dispatch(Project $project, string $purpose = '', string $header = '')
 */
class ChatGetOrCreateChannelJob implements ShouldQueue {
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(
        private Project $project,
        private string $purpose = '',
        private string $header = '',
    ) {}

    public function handle(): void {
        foreach (PluginController::getPluginControllers(PluginChatController::class) as $chatController) {
            try {
                $chatController->getOrCreateChannel($this->project, $this->purpose, $this->header);
            } catch (\Exception $e) {
            }
        }
    }
}
