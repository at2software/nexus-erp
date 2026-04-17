<?php

namespace App\Jobs;

use App\Http\Controllers\PluginChatController;
use App\Http\Controllers\PluginGitController;
use App\Models\Param;
use App\Models\PluginLink;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Collection;

/**
 * @method static \Illuminate\Foundation\Bus\PendingDispatch dispatch(\Illuminate\Support\Collection $links, array{id: int, name: string, web_url: string} $project, array{status: string, ref: string, id: int} $objectAttributes, array<int, array{id: int, name: string, status: string}> $builds, array<string, string> $credentials)
 */
class GitPipelineWebhookJob implements ShouldQueue {
    use Dispatchable;
    use InteractsWithQueue;
    use Queueable;
    use SerializesModels;

    private const DEFAULT_PIPELINE_JOBS = [
        ['job' => 'semgrep-sast',   'artifact' => 'gl-sast-report.json', 'type' => 'sast'],
        ['job' => 'npm-audit',      'artifact' => 'npm-audit.json',       'type' => 'npm'],
        ['job' => 'composer audit', 'artifact' => 'composer-audit.json',  'type' => 'composer'],
        ['job' => 'cargo audit',    'artifact' => 'cargo-audit.json',     'type' => 'cargo'],
    ];

    /**
     * @param Collection<int, PluginLink> $links
     * @param array{id: int, name: string, web_url: string} $project
     * @param array{status: string, ref: string, id: int} $objectAttributes
     * @param array<int, array{id: int, name: string, status: string}> $builds
     * @param array<string, string> $credentials
     */
    public function __construct(
        private Collection $links,
        private array $project,
        private array $objectAttributes,
        private array $builds,
        private array $credentials = [],
    ) {}

    public function handle(): void {
        if ($this->links->isEmpty()) {
            return;
        }

        $emoji      = $this->emojiForStatus($this->objectAttributes['status']);
        $projectUrl = $this->project['web_url'];
        $ref        = $this->objectAttributes['ref'];
        $message    = "[`$emoji ⎇ $ref`]($projectUrl): ";

        foreach ($this->builds as $build) {
            $eBuild = $this->emojiForStatus($build['status']);
            $url    = $projectUrl.'/-/jobs/'.$build['id'];
            $message .= " [`$eBuild {$build['name']}`]($url)";
        }

        $cacheId                 = 'git_pipeline_'.$this->objectAttributes['id'];
        $props                   = $this->props($this->project['name']);
        $props['nexus_cache_id'] = $cacheId;

        foreach ($this->links->siblingsOfType(PluginChatController::class) as $chatInfo) {
            ChatSendMessageJob::dispatch(
                $message,
                $props,
                channelId: $chatInfo['channelId'],
                cacheId: $cacheId,
            );
        }

        $this->dispatchSecurityReports($props);
    }
    private function pipelineJobs(): array {
        $raw = Param::get('SETTINGS_GIT_PIPELINE')?->value;
        if ($raw) {
            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }
        return self::DEFAULT_PIPELINE_JOBS;
    }
    private function dispatchSecurityReports(array $props): void {
        $jobMap = collect($this->pipelineJobs())->keyBy('job');

        $securityBuilds = array_filter(
            $this->builds,
            fn ($b) => $b['status'] === 'success' && $jobMap->has($b['name'])
        );

        if (empty($securityBuilds)) {
            return;
        }

        $controller = new PluginGitController($this->credentials);

        foreach ($securityBuilds as $build) {
            $jobConfig = $jobMap->get($build['name']);
            $data      = $controller->getJobArtifact($this->project['id'], $build['id'], $jobConfig['artifact']);

            if (! $data) {
                continue;
            }

            [$securityMessage, $securityProps] = match ($jobConfig['type']) {
                'sast'     => [$this->formatSast($data),          $this->securityProps($this->project['name'], 'SAST', 'icon-sast.png')],
                'npm'      => [$this->formatNpmAudit($data),      $this->securityProps($this->project['name'], 'NPM', 'icon-npm.png')],
                'composer' => [$this->formatComposerAudit($data), $this->securityProps($this->project['name'], 'Composer', 'icon-composer.png')],
                'cargo'    => [$this->formatCargoAudit($data),    $this->securityProps($this->project['name'], 'Cargo', 'icon-cargo.png')],
                default    => [null, null],
            };

            if (! $securityMessage) {
                continue;
            }

            $securityCacheId                 = 'git_security_'.$build['name'].'_'.$build['id'];
            $securityProps['nexus_cache_id'] = $securityCacheId;

            foreach ($this->links->siblingsOfType(PluginChatController::class) as $chatInfo) {
                ChatSendMessageJob::dispatch(
                    $securityMessage,
                    $securityProps,
                    channelId: $chatInfo['channelId'],
                    cacheId: $securityCacheId,
                );
            }
        }
    }
    private function formatSast(array $data): ?string {
        $vulns = $data['vulnerabilities'] ?? [];
        if (empty($vulns)) {
            return null;
        }

        $lines = [];
        foreach ($vulns as $v) {
            $sev     = $v['severity'] ?? 'Unknown';
            $name    = $v['name'] ?? 'Unknown';
            $file    = $v['location']['file'] ?? '?';
            $line    = $v['location']['start_line'] ?? '?';
            $lines[] = $this->emojiForSeverity($sev)." $name — `$file:$line`";
        }
        return implode("\n", $lines);
    }
    private function formatNpmAudit(array $data): ?string {
        $lines = [];

        foreach ($data['vulnerabilities'] ?? [] as $vuln) {
            foreach ($vuln['via'] ?? [] as $via) {
                if (! is_array($via)) {
                    continue;
                }
                $sev     = $via['severity'] ?? ($vuln['severity'] ?? 'unknown');
                $title   = $via['title'] ?? ($vuln['name'] ?? 'unknown');
                $pkg     = $vuln['name'] ?? '?';
                $lines[] = $this->emojiForSeverity(ucfirst($sev))." **$pkg** — $title";
            }
        }
        return empty($lines) ? null : implode("\n", $lines);
    }
    private function formatCargoAudit(array $data): ?string {
        $lines = [];

        foreach ($data['vulnerabilities']['list'] ?? [] as $vuln) {
            $sev     = $vuln['advisory']['severity'] ?? 'unknown';
            $title   = $vuln['advisory']['title'] ?? 'Unknown';
            $pkg     = $vuln['package']['name'] ?? '?';
            $lines[] = $this->emojiForSeverity($sev)." **$pkg** — $title";
        }
        return empty($lines) ? null : implode("\n", $lines);
    }
    private function formatComposerAudit(array $data): ?string {
        $lines = [];

        foreach ($data['advisories'] ?? [] as $package => $pkgAdvisories) {
            foreach ($pkgAdvisories as $advisory) {
                $title    = $advisory['title'] ?? 'Unknown';
                $cve      = $advisory['cve'] ? " [{$advisory['cve']}]" : '';
                $affected = $advisory['affectedVersions'] ?? '';
                $lines[]  = $this->emojiForSeverity('medium')." **$package** ($affected): $title$cve";
            }
        }
        return empty($lines) ? null : implode("\n", $lines);
    }
    private function emojiForSeverity(string $severity): string {
        return match (strtolower($severity)) {
            'critical' => '🔴',
            'high'     => '🟠',
            'medium', 'warning' => '🟡',
            default => '🟢',
        };
    }
    private function securityProps(string $repoName, string $label, string $icon): array {
        $displayName = "$repoName [$label]";
        return [
            'from_webhook'         => 'true',
            'webhook_display_name' => $displayName,
            'override_username'    => $displayName,
            'override_icon_url'    => asset("icons/$icon"),
            'nexus_type'           => 'git_security',
        ];
    }
    private function props(string $name): array {
        return [
            'from_webhook'         => 'true',
            'webhook_display_name' => $name,
            'override_username'    => $name,
            'override_icon_url'    => asset('icons/icon.git.big.png'),
            'nexus_type'           => 'git_pipeline',
        ];
    }
    private function emojiForStatus(string $status): string {
        return match ($status) {
            'manual', 'skipped' => '⚫',
            'created'  => '🕐',
            'success'  => '✅',
            'failed'   => '❌',
            'canceled' => '⚪',
            'pending'  => '⏳',
            'running'  => '🔵',
            default    => "❓ (unknown $status)",
        };
    }
}
