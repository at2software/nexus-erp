<?php

namespace App\Enums;

use BenSampo\Enum\Enum;

final class SentinelTriggerType extends Enum {
    const Disabled   = 0;
    const Always     = 1;
    const OnCreated  = 2;
    const OnUpdated  = 3;
    const OnDeleted  = 4;
    const Once       = 5;
    const OnSchedule = 6;
}
