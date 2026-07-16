<?php

namespace Database\Factories;

use App\Models\ProjectState;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ProjectState>
 */
class ProjectStateFactory extends Factory {
    protected $model = ProjectState::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array {
        return [
            'name'          => 'Prepared',
            'color'         => '#cccccc',
            'progress'      => ProjectState::Prepared,
            'is_in_stats'   => true,
            'is_successful' => false,
        ];
    }

    public function running(): static {
        return $this->state(fn () => [
            'name'          => 'Running',
            'progress'      => ProjectState::Running,
            'is_successful' => false,
        ]);
    }
    public function finished(bool $successful = true): static {
        return $this->state(fn () => [
            'name'          => 'Finished',
            'progress'      => ProjectState::Finished,
            'is_successful' => $successful,
        ]);
    }
}
