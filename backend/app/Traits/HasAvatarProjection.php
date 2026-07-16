<?php

namespace App\Traits;

trait HasAvatarProjection {
    public function onlyAvatar(): array {
        return $this->only(['id', 'name', 'icon']);
    }
}
