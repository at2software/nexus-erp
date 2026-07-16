<?php

namespace App\Services\Project;

use App\Models\PluginLink;

class ProjectFrameworksService {
    public function index(): mixed {
        $gitLinks = PluginLink::where('type', 'git')
            ->where('is_deprecated', false)
            ->whereNotNull('framework_id')
            ->whereHas('framework', fn ($q) => $q->where('name', '!=', 'unknown'))
            ->with(['framework', 'parent'])
            ->get();

        return $gitLinks->groupBy('url')->map(fn ($links) => [
            'url'               => $links->first()->url,
            'framework'         => $links->first()->framework?->name,
            'name'              => $links->first()->name,
            'framework_version' => $links->first()->framework_version,
            'projects'          => $links->map(fn ($link) => [
                'id'         => $link->parent?->id,
                'name'       => $link->parent?->name,
                'state'      => $link->parent?->state,
                'company'    => $link->parent?->company,
                'project_id' => $link->parent?->project_id,
            ])->filter(fn ($p) => $p['id'] !== null)->values(),
        ])->values();
    }
}
