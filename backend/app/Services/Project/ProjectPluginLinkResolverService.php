<?php

namespace App\Services\Project;

use App\Models\PluginLink;
use App\Models\Project;

class ProjectPluginLinkResolverService {
    public function resolve(array $inputUrls): mixed {
        $urls = array_values(array_unique(array_filter(array_map(
            fn ($u) => rtrim($u, '/'),
            array_filter($inputUrls, 'is_string')
        ))));

        if (! count($urls)) {
            return [];
        }

        $urlsWithSlash = array_map(fn ($u) => $u.'/', $urls);

        return PluginLink::whereIn('url', [...$urls, ...$urlsWithSlash])
            ->whereHasMorph('parent', [Project::class], fn ($q) => $q->whereHas('myAssignment'))
            ->with('parent')
            ->get()
            ->map(fn (PluginLink $link) => [
                'url'            => $link->url,
                'plugin_link_id' => $link->id,
                'project'        => $link->parent,
            ]);
    }
}
