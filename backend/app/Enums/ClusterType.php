<?php

namespace App\Enums;

use Carbon\Carbon;

class ClusterType {
    const Daily   = 0;
    const Monthly = 1;
    const Yearly  = 2;

    public int $value;

    private function __construct(int $value) {
        $this->value = $value;
    }
    public static function getType(Carbon $start, Carbon $end): ClusterType {
        $diff = abs($end->diffInDays($start));
        if ($diff > 365 * 4) {
            return new ClusterType(self::Yearly);
        }
        if ($diff > 30 * 4) {
            return new ClusterType(self::Monthly);
        }
        return new ClusterType(self::Daily);
    }
    public function toString(): string {
        switch ($this->value) {
            case self::Yearly: return '%Y-01-01';
            case self::Monthly: return '%Y-%m-01';
            default: return '%Y-%m-%d';
        }
    }
    public function toCarbonFormat(): string {
        switch ($this->value) {
            case self::Yearly: return 'Y-01-01';
            case self::Monthly: return 'Y-m-01';
            default: return 'Y-m-d';
        }
    }
    public function increase(Carbon &$date): void {
        switch ($this->value) {
            case self::Yearly: $date->addYear();
                break;
            case self::Monthly: $date->addMonth();
                break;
            default: $date->addDay();
        }
    }
}
