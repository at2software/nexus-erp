<?php

namespace Tests\Unit\Queries;

use App\Models\Focus;
use App\Models\Project;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\DatabaseTransactions;
use Tests\TestCase;

class FociTimelineQueryTest extends TestCase {
    use DatabaseTransactions;

    public function test_sums_duration_per_user_per_period(): void {
        $project = Project::factory()->create();
        $alice   = User::factory()->create();
        $bob     = User::factory()->create();

        Focus::factory()->forParent($project)->create(['user_id' => $alice->id, 'started_at' => Carbon::parse('2025-01-05'), 'duration' => 2]);
        Focus::factory()->forParent($project)->create(['user_id' => $alice->id, 'started_at' => Carbon::parse('2025-01-20'), 'duration' => 3]);
        Focus::factory()->forParent($project)->create(['user_id' => $alice->id, 'started_at' => Carbon::parse('2025-03-01'), 'duration' => 4]);
        Focus::factory()->forParent($project)->create(['user_id' => $bob->id, 'started_at' => Carbon::parse('2025-02-10'), 'duration' => 5]);

        $timeline = $project->timeline_chart;

        $byUser = $timeline->keyBy(fn ($_) => $_['user']['id']);
        $alicePeriods = $byUser[$alice->id]['data']->keyBy('period');
        $bobPeriods   = $byUser[$bob->id]['data']->keyBy('period');

        self::assertSame(5.0, $alicePeriods['2025-01-01']['value']);
        self::assertSame(4.0, $alicePeriods['2025-03-01']['value']);
        self::assertArrayNotHasKey('2025-02-01', $alicePeriods->toArray());

        self::assertSame(5.0, $bobPeriods['2025-02-01']['value']);
        self::assertArrayNotHasKey('2025-01-01', $bobPeriods->toArray());
    }

    public function test_one_query_per_call_regardless_of_user_count(): void {
        $project = Project::factory()->create();
        $users   = User::factory()->count(5)->create();

        foreach ($users as $user) {
            Focus::factory()->forParent($project)->create(['user_id' => $user->id, 'started_at' => Carbon::parse('2025-06-15'), 'duration' => 1]);
        }

        $queries = 0;
        \Illuminate\Support\Facades\DB::listen(function () use (&$queries) { $queries++; });

        $project->refresh()->timeline_chart;

        self::assertLessThanOrEqual(4, $queries);
    }
}
