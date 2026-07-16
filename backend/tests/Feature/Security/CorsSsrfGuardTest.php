<?php

namespace Tests\Feature\Security;

use Tests\Support\FakeAuthenticatableUser;
use Tests\TestCase;

class CorsSsrfGuardTest extends TestCase {
    public function test_cors_proxy_rejects_private_ip_target(): void {
        $this->actingAs(new FakeAuthenticatableUser(['user']));

        $this->postJson('/api/cors', [
            'method' => 'get',
            'url'    => 'http://127.0.0.1/internal',
        ])
            ->assertStatus(422)
            ->assertJsonPath('message', 'Requests to private or reserved IP addresses are not allowed.');
    }
}
