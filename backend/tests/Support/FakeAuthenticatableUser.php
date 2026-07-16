<?php

namespace Tests\Support;

use Illuminate\Contracts\Auth\Authenticatable;

class FakeAuthenticatableUser implements Authenticatable {
    public int|string|null $id;

    public function __construct(
        private array $roles = [],
        int|string|null $id = 1
    ) {
        $this->id = $id;
    }

    public function hasAnyRole(array $roles): bool {
        return count(array_intersect($this->roles, $roles)) > 0;
    }
    public function getAuthIdentifierName(): string {
        return 'id';
    }
    public function getAuthIdentifier(): int|string|null {
        return $this->id;
    }
    public function getAuthPasswordName(): string {
        return 'password';
    }
    public function getAuthPassword(): ?string {
        return null;
    }
    public function getRememberToken(): ?string {
        return null;
    }
    public function setRememberToken($value): void {}
    public function getRememberTokenName(): string {
        return 'remember_token';
    }
}
