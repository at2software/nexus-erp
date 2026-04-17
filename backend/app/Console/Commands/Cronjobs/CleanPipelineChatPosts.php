<?php

namespace App\Console\Commands\Cronjobs;

use App\Http\Controllers\PluginChatController;
use App\Http\Controllers\PluginController;
use App\Models\PluginLink;
use Illuminate\Console\Command;

class CleanPipelineChatPosts extends Command {
    protected $signature   = 'chat:clean-pipeline-posts {--days=2 : Delete posts older than this many days} {--interval=1 : Days between runs (limits scan window)}';
    protected $description = 'Delete old git pipeline and security report messages from chat channels';

    public function handle(): void {
        $days     = (int)$this->option('days');
        $interval = (int)$this->option('interval');
        $cutoffMs = now()->subDays($days)->timestamp * 1000;           // older than this → delete
        $windowMs = now()->subDays($days + $interval)->timestamp * 1000; // older than this → already cleaned last run, stop

        $controllers = PluginController::getPluginControllers(PluginChatController::class);
        if (empty($controllers)) {
            $this->info('No chat controllers configured.');
            return;
        }

        $channelIds = PluginLink::where('type', 'mattermost')
            ->pluck('url')
            ->map(fn ($url) => last(explode('/', $url)))
            ->unique()
            ->filter()
            ->values();

        if ($channelIds->isEmpty()) {
            $this->info('No mattermost channels found.');
            return;
        }

        $totalDeleted = 0;

        foreach ($controllers as $controller) {
            foreach ($channelIds as $channelId) {
                $totalDeleted += $this->cleanChannel($controller, $channelId, $cutoffMs, $windowMs);
            }
        }

        $this->info("Done. Deleted $totalDeleted post(s).");
    }
    private function cleanChannel(PluginChatController $controller, string $channelId, int $cutoffMs, int $windowMs): int {
        $page    = 0;
        $deleted = 0;

        while (true) {
            $data  = $controller->getChannelPosts($channelId, $page, 200);
            $posts = $data['posts'] ?? [];
            $order = $data['order'] ?? array_keys($posts);

            if (empty($posts)) {
                break;
            }

            foreach ($order as $postId) {
                $post     = $posts[$postId] ?? null;
                $createAt = $post['create_at'] ?? PHP_INT_MAX;

                if ($createAt >= $windowMs && $createAt < $cutoffMs) {
                    $type = $post['props']['nexus_type'] ?? null;

                    if (in_array($type, ['git_pipeline', 'git_security'])) {
                        $controller->deletePost($postId);
                        $deleted++;
                    }
                }
            }

            $page++;

            // Stop if the oldest post on this page predates the window — everything further back was already cleaned
            $oldestOnPage = min(array_map(fn ($id) => $posts[$id]['create_at'] ?? PHP_INT_MAX, $order));
            if ($oldestOnPage < $windowMs) {
                break;
            }

            if (count($posts) < 200) {
                break;
            }
        }

        if ($deleted > 0) {
            $this->line("  Channel $channelId: deleted $deleted post(s)");
        }
        return $deleted;
    }
}
