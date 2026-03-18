<?php

namespace App\Enums;

use BenSampo\Enum\Enum;
use Illuminate\Support\Carbon;

final class Recurrence extends Enum {
    const None             = 0;
    const Daily            = 1;
    const Weekly           = 4;
    const EveryTwoWeeks    = 5;
    const Monthly          = 2;
    const EveryTwoMonths   = 6;
    const EveryThreeMonths = 7;
    const EverySixMonths   = 8;
    const Yearly           = 3;

    public static function sub(Recurrence $interval, ?Carbon $date = null): Carbon {
        if ($date === null) {
            $date = now();
        }
        switch ($interval->value) {
            case Recurrence::None: return $date;
            case Recurrence::Daily: return $date->subDay();
            case Recurrence::Weekly: return $date->subWeek();
            case Recurrence::EveryTwoWeeks: return $date->subWeeks(2);
            case Recurrence::Monthly: return $date->subMonths(1);
            case Recurrence::EveryTwoMonths: return $date->subMonths(2);
            case Recurrence::EveryThreeMonths: return $date->subMonths(3);
            case Recurrence::EverySixMonths: return $date->subMonths(6);
            case Recurrence::Yearly: return $date->subYear(1);
        }
        return $date;
    }
}
