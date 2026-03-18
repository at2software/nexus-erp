<?php

namespace App\Http\Controllers;

use App\Helpers\NLog;
use App\Models\Project;
use App\Models\User;
use Exception;
use Illuminate\Support\Facades\Cache;

class PluginSlackController extends PluginChatController {
    public static function getKey(): string {
        return 'slack';
    }
    public static function createInstance(): ?static {
        if ($endpoint = env('SLACK_API_ENDPOINT')) {
            $instance = new static;
            $instance->init($endpoint);
            return $instance;
        }
        return null;
    }
    public function __construct() {
    }
    protected function getToken(): string {
        $token = Cache::get('slack_api_token');
        if (! $token) {
            $token = env('SLACK_ACCESS_TOKEN');
            Cache::put('slack_api_token', $token, now()->addMinutes(59));
        }
        return $token;
    }
    public function createOrUpdatePost(string $cacheId, string $channelId, string $message, $props = null) {
        return $this->_createOrUpdatePost($cacheId, $channelId, $message, $props, 'ts');
    }
    public function createPost(string $channelId, string $message, $props = null) {
        $payload = ['channel' => $channelId, 'text' => $message];
        if ($props) {
            $payload['attachments'] = $props;
        }
        return $this->post('chat.postMessage', $payload);
    }
    public function createChannel(string $name, ?string $display_name, string $purpose, string $topic): ?string {
        $payload  = ['name' => $name, 'is_private' => false];
        $response = null;
        try {
            $data = $this->post('conversations.create', $payload);
            if ($data && ! empty($data['channel']['id'])) {
                $response = $data['channel']['id'];
            }
        } catch (Exception $ex) {
            NLog::error($ex);
        }
        try {
            if ($response) {
                if (! empty($purpose)) {
                    $payload         = ['channel' => $response, 'purpose' => $purpose];
                    $purposeResponse = $this->post('conversations.setPurpose', $payload);
                }
                if (! empty($topic)) {
                    $payload       = ['channel' => $response, 'topic' => $topic];
                    $topicResponse = $this->post('conversations.setTopic', $payload);
                }
            }
        } catch (Exception $ex) {
            NLog::error($ex);
        }
        return $response;
    }
    public function addUsersToChannel(string $channelId, User ...$users) {
        $userIds = array_filter(array_map(fn ($user) => $this->getUserId($user), $users), fn ($id) => $id !== null);
        $payload = ['channel' => $channelId, 'users' => implode(',', $userIds)];
        $data    = [];
        try {
            $data = $this->post('conversations.invite', $payload);
        } finally {
            return $data;
        }
    }
    public function getChannelId(string $name): ?string {
        try {
            $data = $this->get('conversations.list');
            foreach ($data['channels'] as $channel) {
                if ($channel['name'] === $name) {
                    return $channel['id'];
                }
            }
        } finally {
            return null;
        }
    }
    public function updatePost(string $timestamp, string $message, $attachments = null, ?string $channelId = null) {
        $payload = [
            'channel' => $channelId,
            'ts'      => $timestamp,
            'text'    => $message,
        ];
        if ($attachments) {
            $payload['attachments'] = $attachments;
        }
        return $this->post('chat.update', $payload);
    }
    public function removeUserFromChannel($channelId, User $user) {
        if ($userId = $this->getUserId($user)) {
            $payload = ['channel' => $channelId, 'user' => $userId];
            return $this->post('conversations.kick', $payload);
        }
    }
    public function getImageMarkdown(string $path, string $title = 'image'): string {
        return 'Image: '.env('API_URL').'../'.$path;
    }
    public function getIconFor(Project $project): string {
        return ':slack: Slack Channel';
    }
    public function env(string $key): ?string {
        return env('SLACK_'.$key);
    }
    public function updatePosition(string $position, string $userId): void {
        // Slack doesn't have a direct position concept, could be implemented via profile fields
        // For now, we'll leave this as a no-op
    }
    public function updateStatus(string $status, string $userId): void {
        $payload = ['user' => $userId, 'status_text' => $status];
        $this->post('users.profile.set', $payload);
    }
    public function getDirectChannelIdFor(string $userId): ?string {
        $data = $this->post('conversations.open', ['users' => $userId]);
        return $data['channel']['id'] ?? null;
    }
    public function getIdFor(User $user): ?string {
        return $this->getUserId($user);
    }
}
