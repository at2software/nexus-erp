<?php

namespace App\Enums;

use BenSampo\Enum\Enum;

final class VacationState extends Enum {
    const Open        = 0;
    const Approved    = 1;
    const NotApproved = 2;
    const Sick        = 3;
    const Cancelled   = 4;
}
