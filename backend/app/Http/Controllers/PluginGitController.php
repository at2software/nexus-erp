<?php

namespace App\Http\Controllers;

use App\Helpers\NLog;
use App\Models\PluginLink;
use App\Traits\HasVaultCredentials;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PluginGitController extends PluginController {
    use HasVaultCredentials;

    public static function getKey(): string {
        return 'gitlab';
    }
    public function vaultPrefix(): string {
        return 'GITLAB';
    }
    public function checkCredentials(): bool {
        return $this->checkResponse(fn () => $this->showUser());
    }
    public function __construct($credentials = null) {
        $this->credentials = $credentials;

        // inside try/catch block because this Controller is also instantiated in api.php, where the database is not set up yet
        try {
            if (! $credentials && DB::connection()->getDatabaseName()) {
                $this->credentials = $this->getCredentials();
            }
        } catch (\Throwable $e) {
        }

        if (! $credentials) {
            $this->middleware('apikey:X-Gitlab-Token,'.$this->env('APIKEY'));
            $this->middleware('has_plugin:GITLAB_URL');
        }
        if ($this->env('URL')) {
            $this->init('');
        } else {
            return null;
        }
    }
    protected function getToken(): string {
        return $this->env('TOKEN');
    }
    private function projectPathWithId(array $project): string {
        return substr($project['web_url'], 0, -strlen($project['path_with_namespace'])).'projects/'.$project['id'];
    }
    private function projectPathForPluginLink(PluginLink $link): string {
        $parts = explode('/projects/', $link->url);
        return $parts[0].'/api/v4/projects/'.$parts[1];
    }
    public function props($name = 'GitLab Webhook') {
        return [
            'from_webhook'         => 'true',
            'webhook_display_name' => $name,
            'override_username'    => $name,
            'override_icon_url'    => asset('icons/icon.git.big.png'),
        ];
    }
    private function emojiForIssueState(string $status): string {
        switch ($status) {
            case 1:
                return '⚠️';
            case 2:
                return '✅';
        }
        return '⚠️';
    }
    private function emojiForStatus(string $status): string {
        switch ($status) {
            case 'manual':
            case 'created':
            case 'skipped':
                return '⚫';
            case 'success':
                return '✅';
            case 'failed':
                return '❌';
            case 'canceled':
                return '🛑';
            case 'pending':
            case 'running':
                return '⏳';
        }
        return "❓ (unknown $status)";
    }

    // ############ Incoming

    public function downloadTest() {
        $projectId = null; // Configure with your GitLab project ID
        $jobId     = null; // Configure with your GitLab job ID
        if (! $projectId || ! $jobId) {
            return;
        }
        $baseUrl  = $this->env('URL').'api/v4/projects/'.$projectId;
        $sastData = $this->get("$baseUrl/jobs/$jobId");
        $sastKey  = $this->array_find_key($sastData['artifacts'] ?? [], fn ($_) => $_['file_type'] === 'sast');
        if ($sastKey !== -1) {
            $sastFile = $this->get("$baseUrl/jobs/$jobId/artifacts/download?file_type=sast");
            NLog::info(print_r($sastFile, true));
        }
    }
    public function onWebhook(Request $data): void {
        $data->validate(['object_kind' => 'required|string']);
        $projectUrl = $this->projectPathWithId($data->project);
        $links      = PluginLink::where('url', $projectUrl)->with('parent')->get();
        switch ($data->object_kind) {
            case 'build':
                break;
            case 'pipeline':
                if ($links) {
                    foreach ($links->siblingsOfType(\App\Http\Controllers\PluginChatController::class) as $chatInfo) {
                        $channelId   = $chatInfo['channelId'];
                        $emoji       = $this->emojiForStatus($data->object_attributes['status']);
                        $projectName = $data->project['name'];
                        $projectUrl  = $data->project['web_url'];
                        $attributes  = $data->object_attributes['ref'];
                        $message     = "[`$emoji ⎇ $attributes`]($projectUrl): ";
                        foreach ($data->builds as $build) {
                            $eBuild = $this->emojiForStatus($build['status']);
                            $url    = $data->project['web_url'].'/-/jobs/'.$build['id'];
                            $name   = $build['name'];
                            $message .= " [`$eBuild $name`]($url)";
                        }
                        \App\Jobs\ChatSendMessageJob::dispatch($message, $this->props($projectName), channelId: $channelId, cacheId: 'git_pipeline_'.$data->object_attributes['id']);
                    }
                }
                break;
            case 'issue':
                if ($data->object_attributes['action'] === 'update' && isset($data->changes['state_id'])) {
                    // ignore this event because the "close" event will fire as well
                    return;
                }
                foreach ($links->siblingsOfType(\App\Http\Controllers\PluginChatController::class) as $chatInfo) {
                    $channelId  = $chatInfo['channelId'];
                    $emoji      = $this->emojiForIssueState($data->object_attributes['state_id']);
                    $message    = "[`$emoji #".$data->object_attributes['iid'].'`]('.$data->project['web_url'].'/-/issues/'.$data->object_attributes['iid'].') ';
                    $message .= $data->object_attributes['title'];
                    if (! empty(@$data->assignees)) {
                        $message .= ' (';
                        foreach ($data->assignees as $assignee) {
                            $message .= '!['.$assignee['name'].']('.$assignee['avatar_url'].' =16 "'.$assignee['name'].'")';
                        }
                        $message .= ')';
                    } else {
                        $message .= ' (unassigned)';
                    }
                    $props = [
                        ...$this->props($data->project['name']),
                        'attachments' => [[
                            'author_name' => $data->user['name'],
                            'text'        => $data->object_attributes['description'],
                            'color'       => '#FFA200',
                        ]],
                    ];
                    if ($data->object_attributes['action'] === 'open') {
                        $message .= ' → `opened`';
                        if (strlen(trim($data->object_attributes['description'])) === 0) {
                            unset($props['attachments']);
                        }
                    }
                    if ($data->object_attributes['action'] === 'update') {
                        $message .= ' → `updated`';
                        if (isset($data->changes['state_id'])) {
                            if ($data->changes['state_id'] === 1) {
                                $message .= '`opened`';
                            }
                            if ($data->changes['state_id'] === 1) {
                                $message .= '`closed`';
                            }
                        }
                        unset($props['attachments']);
                    }
                    if ($data->object_attributes['action'] === 'reopen') {
                        $message .= ' → `reopened`';
                        unset($props['attachments']);
                    }
                    if ($data->object_attributes['action'] === 'close') {
                        $message .= ' → `closed`';
                        unset($props['attachments']);
                    }
                    \App\Jobs\ChatSendMessageJob::dispatch($message, $props, channelId: $channelId);
                }
                break;
            case 'note':
                foreach ($links->siblingsOfType(\App\Http\Controllers\PluginChatController::class) as $chatInfo) {
                    $channelId  = $chatInfo['channelId'];
                    $emoji      = $this->emojiForIssueState($data->issue['state_id']);
                    $message    = "[`$emoji #".$data->issue['iid'].'`]('.$data->project['web_url'].'/-/issues/'.$data->issue['iid'].') ';
                    $message .= $data->issue['title'];
                    $props = [
                        ...$this->props('GitLab Note'),
                        'attachments' => [[
                            'author_name' => $data->user['name'],
                            'text'        => $data->object_attributes['note'],
                            'color'       => '#0A8BC9',
                        ]],
                    ];
                    \App\Jobs\ChatSendMessageJob::dispatch($message, $props, channelId: $channelId);
                }
                break;
            case 'push':
                // Reset framework detection on push
                if ($links->isNotEmpty()) {
                    foreach ($links as $link) {
                        $link->update([
                            'framework_id'      => null,
                            'framework_version' => null,
                        ]);
                    }

                    // Trigger framework detection for the first link (all links share same repo)
                    try {
                        $detection     = $this->detectFramework($links->first());
                        $frameworkName = $detection['framework'];
                        $version       = $detection['version'];

                        $framework = \App\Models\Framework::where('name', $frameworkName)->first();
                        if ($framework) {
                            foreach ($links as $link) {
                                $link->update([
                                    'framework_id'      => $framework->id,
                                    'framework_version' => $version,
                                ]);
                            }
                        }
                    } catch (\Exception $e) {
                        NLog::warning("Framework detection failed on push: {$e->getMessage()}");
                    }
                }
                break;
            default:
                NLog::info(print_r(request()->all(), true));
        }
        // $localai = app(PluginLocalAIController::class);
        // if($localai) $localai->onWebhook($data);
    }

    // ########### Outgoing

    public function showUser() {
        $url      = $this->env('URL').'api/v4/user';
        $response = $this->get($url);
        return $response;
    }
    public function indexWebhooks(PluginLink $link) {
        return $this->get($this->projectPathForPluginLink($link).'/hooks');
    }
    public function deleteWebhook(PluginLink $link, $id) {
        return $this->delete($this->projectPathForPluginLink($link).'/hooks/'.$id);
    }
    public function storeWebhook(PluginLink $link) {
        return $this->post($this->projectPathForPluginLink($link).'/hooks', [
            'url'               => env('API_URL').'gitlab',
            'token'             => $this->env('APIKEY'),
            'name'              => 'NEXUS',
            'description'       => 'NEXUS Webhook',
            'deployment_events' => true,
            'issues_events'     => true,
            'job_events'        => true,
            'note_events'       => true,
            'pipeline_events'   => true,
        ]);
    }
    public function getCommitDiff($projectId, $commitId): string {
        $url = $this->env('URL')."/v4/projects/{$projectId}/repository/commits/{$commitId}/diff";
        return json_encode($this->get($url), JSON_PRETTY_PRINT);
    }
    public function getFileContent(PluginLink $link, string $filePath): ?string {
        try {
            $url      = $this->projectPathForPluginLink($link).'/repository/files/'.urlencode($filePath).'/raw';
            $payload  = ['headers' => $this->getHeaders()];
            $response = $this->client->get($url, $payload);
            return $response->getBody()->getContents();
        } catch (\Exception $e) {
            return null;
        }
    }
    private function getRepositoryTree(PluginLink $link, string $path = '', bool $recursive = false): ?array {
        try {
            $url    = $this->projectPathForPluginLink($link).'/repository/tree';
            $params = ['path' => $path];
            if ($recursive) {
                $params['recursive'] = 'true';
            }
            $payload = [
                'headers' => $this->getHeaders(),
                'query'   => $params,
            ];
            $response = $this->client->get($url, $payload);
            return json_decode($response->getBody()->getContents(), true);
        } catch (\Exception $e) {
            return null;
        }
    }
    public function detectFramework(PluginLink $link): array {
        // Check for Laravel
        if ($composerJson = $this->getFileContent($link, 'composer.json')) {
            $composer = json_decode($composerJson, true);
            if (isset($composer['require']['laravel/framework'])) {
                return [
                    'framework' => 'laravel',
                    'version'   => $composer['require']['laravel/framework'],
                ];
            }
        }

        // Check for package.json (for Angular)
        if ($packageJson = $this->getFileContent($link, 'package.json')) {
            $package = json_decode($packageJson, true);

            // Check for Angular
            if (isset($package['dependencies']['@angular/core'])) {
                return [
                    'framework' => 'angular',
                    'version'   => $package['dependencies']['@angular/core'],
                ];
            }
        }

        // Check for iOS/macOS project by looking for .xcodeproj folder
        if ($tree = $this->getRepositoryTree($link)) {
            foreach ($tree as $item) {
                if ($item['type'] === 'tree' && str_ends_with($item['name'], '.xcodeproj')) {
                    $version   = null;
                    $framework = null;

                    // Try to get deployment target from project.pbxproj
                    $pbxprojPath = $item['path'].'/project.pbxproj';
                    if ($pbxproj = $this->getFileContent($link, $pbxprojPath)) {
                        // Check for macOS first
                        if (preg_match('/MACOSX_DEPLOYMENT_TARGET\s*=\s*([0-9.]+)/', $pbxproj, $matches)) {
                            $framework = 'macos';
                            $version   = $matches[1];
                        }
                        // Then check for iOS
                        elseif (preg_match('/IPHONEOS_DEPLOYMENT_TARGET\s*=\s*([0-9.]+)/', $pbxproj, $matches)) {
                            $framework = 'ios';
                            $version   = $matches[1];
                        }
                    }

                    // Default to ios if we found xcodeproj but couldn't determine platform
                    if (! $framework) {
                        $framework = 'ios';
                    }
                    return [
                        'framework' => $framework,
                        'version'   => $version,
                    ];
                }
            }
        }

        // Check for Android project - try multiple possible locations
        $androidGradlePaths = [
            'app/build.gradle',
            'app/build.gradle.kts',
            'build.gradle',
            'build.gradle.kts',
        ];

        foreach ($androidGradlePaths as $path) {
            if ($buildGradle = $this->getFileContent($link, $path)) {
                $version = null;

                // Extract API level from build.gradle
                // Handles various formats: targetSdk 34, targetSdkVersion = 34, targetSdk: 34, targetSdk(34), compileSdk 32
                if (preg_match('/targetSdk(?:Version)?\s*[=:(\s]\s*(\d+)/', $buildGradle, $matches)) {
                    $version = $matches[1];
                } elseif (preg_match('/compileSdk(?:Version)?\s*[=:(\s]\s*(\d+)/', $buildGradle, $matches)) {
                    $version = $matches[1];
                }

                // Only return if we actually found an Android project indicator
                if ($version || strpos($buildGradle, 'com.android.application') !== false || strpos($buildGradle, 'com.android.library') !== false) {
                    return [
                        'framework' => 'android',
                        'version'   => $version,
                    ];
                }
            }
        }
        return [
            'framework' => 'unknown',
            'version'   => null,
        ];
    }
    private function array_find_key(array $array, callable $callback) {
        foreach ($array as $key => $value) {
            if ($callback($value)) {
                return $key;
            }
        }
        return -1;
    }
}
