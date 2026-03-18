<?php

namespace App\Builders;

use App\Traits\HasParamsBuilder;
use App\Traits\HasVcardBuilder;

class CompanyContactBuilder extends BaseBuilder {
    use HasParamsBuilder;
    use HasVcardBuilder;
}
