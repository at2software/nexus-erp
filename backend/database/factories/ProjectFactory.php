<?php

namespace Database\Factories;

use App\Models\Company;
use App\Models\Project;
use App\Models\ProjectState;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Support\Facades\DB;

/**
 * @extends Factory<Project>
 */
class ProjectFactory extends Factory {
    protected $model = Project::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array {
        return [
            'company_id'       => Company::factory(),
            'name'             => fake()->words(3, true),
            'description'      => '',
            'is_time_based'    => false,
            'is_internal'      => false,
            'lead_probability' => 0.2,
        ];
    }

    /**
     * Attach an additional state so it becomes the project's latest state
     * (the initial "Prepared" state, id 1, is auto-attached on creation).
     */
    public function withState(int $progress, bool $successful = true): static {
        return $this->afterCreating(function (Project $project) use ($progress, $successful) {
            $project->states()->attach(
                ProjectStateFactory::new()->state([
                    'progress'      => $progress,
                    'is_successful' => $successful,
                ])->create()->id
            );
        });
    }

    public function running(): static {
        return $this->withState(ProjectState::Running, false);
    }
    public function finished(bool $successful = true): static {
        return $this->withState(ProjectState::Finished, $successful);
    }

    /**
     * `work_estimated` is precomputed from invoice items and gets reset on every
     * Eloquent save of this project (or of a related Focus, which touches its
     * parent) via PrecomputedTrait — so it's written directly to the DB here,
     * bypassing model events. Call this AFTER creating any related Focus records.
     */
    public function workEstimated(float $hours): static {
        return $this->afterCreating(function (Project $project) use ($hours) {
            DB::table('projects')->where('id', $project->id)->update(['work_estimated' => $hours]);
            $project->refresh();
        });
    }
}
