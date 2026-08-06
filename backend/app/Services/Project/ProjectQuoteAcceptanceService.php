<?php

namespace App\Services\Project;

use App\ML\ProjectQuoteDataset;
use App\ML\ProjectQuoteHistory;
use App\ML\ProjectQuoteModel;
use App\ML\ProjectQuoteWhatIf;
use App\Models\Project;
use App\Models\ProjectState;

/**
 * Builds the on-demand (never persisted — computed fresh on every call, see
 * ProjectController::showQuoteAcceptancePrediction()) quote-acceptance
 * prediction for a single project: the model's probability, the project's
 * current feature values (for transparency), and "what would move the
 * needle" suggestions from ProjectQuoteWhatIf.
 */
class ProjectQuoteAcceptanceService {
    public function build(Project $project): ?array {
        if (! ProjectQuoteModel::load()) {
            return null;
        }

        $project->loadMissing(['states', 'company']);

        $history = ProjectQuoteHistory::compute(ProjectQuoteDataset::eligibleProjects(), collect([$project]));
        $row     = ProjectQuoteDataset::extractRow($project, $history[$project->id] ?? []);

        $probability = ProjectQuoteModel::probaForRow($row);
        $decided     = $project->states->contains(fn (ProjectState $state) => $state->progress !== ProjectState::Prepared);

        return [
            'probability'    => $probability,
            'decided'        => $decided,
            'actual_outcome' => $decided ? ProjectQuoteDataset::isAccepted($project) : null,
            'features'       => array_intersect_key($row, array_flip(ProjectQuoteDataset::FEATURES)),
            'suggestions'    => $probability !== null ? ProjectQuoteWhatIf::suggest($row, $probability) : [],
        ];
    }
}
