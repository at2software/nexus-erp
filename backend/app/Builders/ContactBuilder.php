<?php

namespace App\Builders;

use App\Traits\HasVcardBuilder;

class ContactBuilder extends BaseBuilder {
    use HasVcardBuilder;

    public function whereHasActiveCompanies() {
        return $this->whereHas('active_companies');
    }
}
