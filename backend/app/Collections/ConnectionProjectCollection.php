<?php

namespace App\Collections;

use App\Models\BaseCollection;
use App\Models\Company;
use App\Models\ConnectionProject;
use App\Models\Project;

class ConnectionProjectCollection extends BaseCollection {
    public function mapSimple(Company $_, ?Project $_project = null, bool $includeProjectCount = false) {
        return $this->map(function (ConnectionProject $cp) use ($_, $_project, $includeProjectCount) {
            $connection   = $cp->connection;
            $otherCompany = $connection->getOtherCompany($_->id);
            $response     = [
                'id'            => $cp->id,
                'connection_id' => $connection->id,
                'other_company' => $otherCompany->only(['id', 'class', 'name', 'icon']),
            ];
            if ($includeProjectCount && $_project) {
                $projectCount = \DB::table('connection_projects')
                    ->join('projects', 'projects.id', '=', 'connection_projects.project_id')
                    ->where('connection_projects.connection_id', $connection->id)
                    ->where('projects.company_id', $_project->company_id)
                    ->where('projects.id', '!=', $_project->id)
                    ->count();
                $response['project_count'] = $projectCount;
                return $response;
            }
            return $response;
        });
    }
    public function mapSimplified(Project $_, bool $includeProjectCount = true) {
        return $this->mapSimple($_->company, $_, $includeProjectCount);
    }
}
