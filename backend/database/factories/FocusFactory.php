<?php

namespace Database\Factories;

use App\Models\Focus;
use Illuminate\Database\Eloquent\Factories\Factory;
use Illuminate\Database\Eloquent\Model;

/**
 * @extends Factory<Focus>
 */
class FocusFactory extends Factory {
    protected $model = Focus::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array {
        return [
            'started_at' => fake()->dateTimeBetween('-6 months', 'now'),
            'duration'   => fake()->randomFloat(2, 0.5, 8),
            'flags'      => 0,
        ];
    }

    public function forParent(Model $parent): static {
        return $this->state(fn () => $parent->toPoly());
    }
}
