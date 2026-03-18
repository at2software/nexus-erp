<?php

namespace App\Traits;

use App\Models\ProjectState;

trait HasProjectStateTrait {
    public function hasStateChangedTo(int $progress, ProjectState $previousState): bool {
        if ($this->state->progress === $previousState->progress) {
            return false;
        }
        return $this->state->progress === $progress;
    }
    public function getStateChangeMessage(ProjectState $previousState): ?string {
        if ($this->hasStateChangedTo(ProjectState::Running, $previousState)) {
            return 'Projekt beginnt';
        }

        if ($this->hasStateChangedTo(ProjectState::Finished, $previousState)) {
            if (! $this->state->is_in_stats) {
                return 'Projekt wurde ignoriert.';
            }

            if (! $this->state->is_successful) {
                if ($previousState->progress === ProjectState::Prepared) {
                    return 'Projekt kam leider nicht zustande.';
                }
                return 'Projekt fehlgeschlagen.';
            }
            return 'Projekt beendet. Gute Arbeit.';
        }
        return null;
    }
}
