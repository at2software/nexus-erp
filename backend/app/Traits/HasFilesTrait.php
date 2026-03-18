<?php

namespace App\Traits;

use App\Models\File;

trait HasFilesTrait {
    protected static function bootHasFilesTrait(): void {
        static::deleting(function ($_) {
            $_->files()->delete();
        });
    }
    public function files() {
        return $this->hasManyMorph(File::class);
    }
}
