<?php

namespace Database\Factories;

use App\Models\User;
use App\Models\VacationGrant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<VacationGrant>
 */
class VacationGrantFactory extends Factory {
    protected $model = VacationGrant::class;

    /**
     * @return array<string, mixed>
     */
    public function definition(): array {
        return [
            'user_id'    => User::factory(),
            'name'       => fake()->words(2, true),
            'amount'     => 30,
            'expires_at' => now()->addYear(),
            'flags'      => 0,
        ];
    }
}
