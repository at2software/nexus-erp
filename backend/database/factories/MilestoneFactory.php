<?php

namespace Database\Factories;

use App\Models\Milestone;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Milestone>
 */
class MilestoneFactory extends Factory {
    protected $model = Milestone::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array {
        return [
            'name'     => fake()->sentence(3),
            'flags'    => 0,
            'duration' => fake()->randomFloat(2, 1, 20),
        ];
    }
}
