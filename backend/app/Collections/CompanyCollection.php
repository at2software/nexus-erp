<?php

namespace App\Collections;

use App\Models\BaseCollection;

class CompanyCollection extends BaseCollection {
    public function onlyAvatar() {
        return $this->map->onlyAvatar();
    }
}
