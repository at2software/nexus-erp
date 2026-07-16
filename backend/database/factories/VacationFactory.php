<?php

namespace Database\Factories;

use App\Enums\VacationState;
use App\Models\Vacation;
use App\Models\VacationGrant;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Vacation>
 */
class VacationFactory extends Factory {
    protected $model = Vacation::class;

    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array {
        return [
            'vacation_grant_id' => VacationGrant::factory(),
            'state'             => VacationState::Approved,
            'started_at'        => now(),
            'ended_at'          => now(),
            'amount'            => -8,
            'comment'           => '',
            'log'               => '',
            'flags'             => 0,
        ];
    }

    public function forUser(int $userId): static {
        return $this->state(fn () => ['vacation_grant_id' => VacationGrant::factory()->state(['user_id' => $userId])]);
    }
}
