<?php

namespace Tests\Feature\Security;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Schema;
use Tests\Support\FakeMassAssignmentModel;
use Tests\TestCase;

class MassAssignmentGuardApiTest extends TestCase {
    protected function setUp(): void {
        parent::setUp();

        Route::post('/_tests/mass-assignment', function (Request $request) {
            $model = new FakeMassAssignmentModel;
            $model->applyObject($request->all());

            return response()->json([
                'safe'       => $model->safe ?? null,
                'admin_only' => $model->admin_only ?? null,
                'hidden_only'=> $model->hidden_only ?? null,
            ]);
        });
    }
    public function test_non_fillable_fields_are_not_applied_from_api_payload(): void {
        Schema::shouldReceive('hasColumn')
            ->andReturnUsing(fn (string $table, string $column) => in_array($column, ['safe', 'admin_only', 'hidden_only'], true));

        $this->postJson('/_tests/mass-assignment', [
            'safe'        => 'ok',
            'admin_only'  => '1',
            'hidden_only' => 'secret',
        ])
            ->assertOk()
            ->assertJson([
                'safe'        => 'ok',
                'admin_only'  => null,
                'hidden_only' => null,
            ]);
    }
}
