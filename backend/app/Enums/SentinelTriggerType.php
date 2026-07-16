<?php

namespace App\Enums;

enum SentinelTriggerType: int {
    case Disabled   = 0;
    case Always     = 1;
    case OnCreated  = 2;
    case OnUpdated  = 3;
    case OnDeleted  = 4;
    case Once       = 5;
    case OnSchedule = 6;
}
