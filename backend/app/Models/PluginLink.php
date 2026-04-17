<?php

namespace App\Models;

use App\Http\Controllers\PluginController;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class PluginLink extends BaseModel {
    use HasFactory;

    const FLAG_GITLAB_HOOKED = 1 << 0;

    protected $fillable = ['name', 'url', 'path', 'type', 'parent_id', 'parent_type', 'framework_id', 'framework_version'];
    protected $hidden   = ['deleted_at', 'created_at', 'updated_at'];
    protected $access   = ['admin' => '*', 'project_manager' => 'crud', 'user' => 'crud'];

    public function parent(): MorphTo {
        return $this->morphTo();
    }
    public function framework() {
        return $this->belongsTo(Framework::class);
    }
    public function getIconAttribute() {
        switch ($this->type) {
            case 'git': return '../icons/git.png';
            case 'mattermost': return '../icons/mattermost.png';
            case 'mantis': return '../icons/mantis.png';
            case 'svn': return '../icons/svn.png';
        }
        return '../icons/dashboard.jpg';
    }
    public static function buildApiPathFromProject(array $project): string {
        return substr($project['web_url'], 0, -strlen($project['path_with_namespace'])).'projects/'.$project['id'];
    }
    public function buildApiPath(): string {
        $parts = explode('/projects/', $this->url);
        return $parts[0].'/api/v4/projects/'.$parts[1];
    }
    public static function arrayFindKey(array $array, callable $callback): int {
        foreach ($array as $key => $value) {
            if ($callback($value)) {
                return $key;
            }
        }
        return -1;
    }
    public function newCollection(array $models = []): PluginLinkCollection {
        return new PluginLinkCollection($models);
    }
}

class PluginLinkCollection extends Collection {
    public function siblingsOfType($type) {
        // Controller class-based matching
        if (class_exists($type) && is_subclass_of($type, PluginController::class)) {
            // Get all instantiated controllers directly
            $controllers = PluginController::getPluginControllers($type);

            $result = [];

            foreach ($this as $link) {
                if ($link->parent) {
                    // Find controllers that match the plugin link types for this parent
                    $linkTypes = $link->parent->pluginLinks()->pluck('type', 'url')->toArray();

                    foreach ($controllers as $controller) {
                        $controllerKey = $controller->getKey();
                        foreach ($linkTypes as $url => $linkType) {
                            if ($linkType === $controllerKey) {
                                // Extract channel ID from URL for this specific link
                                $channelId = $this->extractChannelId($url, $controller);
                                if ($channelId) {
                                    $result[] = [
                                        'controller' => $controller,
                                        'channelId'  => $channelId,
                                        'url'        => $url,
                                    ];
                                }
                            }
                        }
                    }
                }
            }
            return collect($result);
        }

        // Handle both string types (legacy) and controller classes
        if (is_string($type)) {
            // Legacy string-based type matching
            $links = [];
            foreach ($this as $link) {
                if ($link->parent) {
                    foreach ($link->parent->pluginLinks()->where('type', $type)->get() as $_) {
                        $links[] = $_->url;
                    }
                }
            }
            return array_unique($links);
        }
        return collect([]);
    }
    private function extractChannelId(string $url, $controller): ?string {
        // Extract channel ID from URL based on controller type
        $parts = explode('/', $url);
        return array_pop($parts); // Last part should be channel ID
    }
}
