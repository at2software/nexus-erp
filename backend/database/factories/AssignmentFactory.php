<?php

namespace Database\Factories;

use App\Models\Assignment;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<Assignment>
 */
class AssignmentFactory extends Factory {
    protected $model = Assignment::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array {
        return [
            'hours_planned' => fake()->randomFloat(2, 5, 40),
            'hours_weekly'  => 0,
            'flags'         => 0,
        ];
    }

    public function forParent(Model $parent): static {
        return $this->state(fn () => $parent->toPoly());
    }
    public function forAssignee(Model $assignee): static {
        return $this->state(fn () => $assignee->toPoly('assignee'));
    }
}
