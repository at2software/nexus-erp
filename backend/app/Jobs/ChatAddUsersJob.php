<?php

namespace App\Jobs;

use App\Http\Controllers\PluginChatController;
use App\Http\Controllers\PluginController;
use App\Models\Project;
use App\Models\User;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

/**
 * @method static \Illuminate\Foundation\Bus\PendingDispatch dispatch(Project $project, array $userIds)
 */
class ChatAddUsersJob implements ShouldQueue {
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    public function __construct(
        private Project $project,
        private array $userIds,
    ) {}

    public function handle(): void {
        $users = User::whereIn('id', $this->userIds)->get();

        foreach (PluginController::getPluginControllers(PluginChatController::class) as $chatController) {
            try {
                if ($channelId = $chatController->getChannelIdFor($this->project)) {
                    $chatController->addUsersToChannel($channelId, ...$users);
                }
            } catch (\Exception $e) {
            }
        }
    }
}
