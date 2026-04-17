<?php

use App\Models\Param;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    private const DEFAULT_PAYMENT_PLAN_TIERS = [
        [
            'label'     => 'small',
            'threshold' => 10000,
            'steps'     => [
                ['percentage' => 100, 'trigger' => 'acceptance'],
            ],
        ],
        [
            'label'     => 'medium',
            'threshold' => 50000,
            'steps'     => [
                ['percentage' => 30, 'trigger' => 'project_start'],
                ['percentage' => 30, 'trigger' => 'feature_complete'],
                ['percentage' => 40, 'trigger' => 'acceptance'],
            ],
        ],
        [
            'label'     => 'large',
            'threshold' => null,
            'steps'     => [
                ['percentage' => 70, 'trigger' => 'monthly', 'months' => 6],
                ['percentage' => 30, 'trigger' => 'acceptance'],
            ],
        ],
    ];

    public function up(): void {

        // Roles, assignment roles, and initial admin user
        Artisan::call('db:insert-basic-roles');

        // Frameworks (final consolidated state)
        $now        = now();
        $frameworks = [
            ['name' => 'unknown',  'latest_version' => null,  'created_at' => $now, 'updated_at' => $now],
            ['name' => 'laravel',  'latest_version' => null,  'created_at' => $now, 'updated_at' => $now],
            ['name' => 'angular',  'latest_version' => null,  'created_at' => $now, 'updated_at' => $now],
            ['name' => 'android',  'latest_version' => null,  'created_at' => $now, 'updated_at' => $now],
            ['name' => 'ios',      'latest_version' => '18',  'created_at' => $now, 'updated_at' => $now],
            ['name' => 'macos',    'latest_version' => '15',  'created_at' => $now, 'updated_at' => $now],
        ];
        foreach ($frameworks as $framework) {
            DB::table('frameworks')->insertOrIgnore($framework);
        }

        // Debrief problem categories
        $categories = [
            ['name' => 'Customer',  'color' => '#0A8BC9', 'icon' => 'person', 'position' => 1],
            ['name' => 'Process',   'color' => '#30E800', 'icon' => 'sync',   'position' => 2],
            ['name' => 'Technical', 'color' => '#F9001D', 'icon' => 'code',   'position' => 3],
            ['name' => 'Planning',  'color' => '#FFA200', 'icon' => 'event',  'position' => 4],
        ];
        foreach ($categories as $category) {
            DB::table('debrief_problem_categories')->insertOrIgnore([
                ...$category,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }

        // Default payment plan tiers
        $param = Param::get('PROJECT_PAYMENT_PLAN_TIERS');
        if ($param->value === null) {
            $param->value = json_encode(self::DEFAULT_PAYMENT_PLAN_TIERS);
            $param->save();
        }
    }
    public function down(): void {
        DB::table('frameworks')->whereIn('name', ['unknown', 'laravel', 'angular', 'android', 'ios', 'macos'])->delete();
        DB::table('debrief_problem_categories')->delete();

        $param        = Param::get('PROJECT_PAYMENT_PLAN_TIERS');
        $param->value = null;
        $param->save();
    }
};
