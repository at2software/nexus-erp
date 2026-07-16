<?php

namespace Tests\Feature\Auth;

use Illuminate\Support\Facades\Route;
use Tests\Support\FakeAuthenticatableUser;
use Tests\TestCase;

class RoleMiddlewareTest extends TestCase {
    protected function setUp(): void {
        parent::setUp();

        Route::middleware('role:financial')->get('/_tests/role-financial', fn () => response()->json(['ok' => true]));
    }
    public function test_role_middleware_denies_user_without_required_role(): void {
        $this->actingAs(new FakeAuthenticatableUser(['user']));

        $this->getJson('/_tests/role-financial')
            ->assertStatus(403);
    }
    public function test_role_middleware_allows_user_with_required_role(): void {
        $this->actingAs(new FakeAuthenticatableUser(['financial']));

        $this->getJson('/_tests/role-financial')
            ->assertOk()
            ->assertJson(['ok' => true]);
    }
}
